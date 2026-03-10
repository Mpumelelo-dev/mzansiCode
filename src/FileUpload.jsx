// FileUpload.jsx
import { useState } from 'react';
import styles from './FileUpload.module.css';

export const FileUpload = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setProgress(0);

    try {
      // Use the global uploadFile function from AuthForm
      const result = await window.uploadFile(file, (percentage) => {
        setProgress(percentage);
      });

      console.log('Upload complete:', result);
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.uploadContainer}>
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        className={styles.fileInput}
        accept="image/*,video/*,application/pdf"
      />
      
      {uploading && (
        <div className={styles.progressContainer}>
          <div className={styles.fileName}>{fileName}</div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className={styles.progressText}>{progress}%</div>
        </div>
      )}
    </div>
  );
};