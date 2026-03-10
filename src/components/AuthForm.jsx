import { useState } from 'react';
import axios from 'axios';
import styles from './AuthForm.module.css';
import logo from './safeMzansi-logo.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AuthForm() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({
    name: '',
    surname: '',
    cell: '',
    email: '',
    password: '',
    emergencyContacts: [{ name: '', cell: '', email: '' }],
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e, index = null) => {
    const { name, value } = e.target;
    if (name.startsWith('emergency')) {
      const field = name.split('.')[1];
      const updated = [...form.emergencyContacts];
      updated[index][field] = value;
      setForm({ ...form, emergencyContacts: updated });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const addContact = () => {
    setForm({
      ...form,
      emergencyContacts: [...form.emergencyContacts, { name: '', cell: '', email: '' }],
    });
  };

  const removeContact = (index) => {
    if (form.emergencyContacts.length > 1) {
      const updated = form.emergencyContacts.filter((_, i) => i !== index);
      setForm({ ...form, emergencyContacts: updated });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isSignup ? '/auth/signup' : '/auth/login';
      
      const requestData = isSignup ? {
        email: form.email,
        password: form.password,
        name: form.name,
        surname: form.surname,
        cell: form.cell,
        emergencyContacts: form.emergencyContacts
      } : {
        email: form.email,
        password: form.password
      };

      console.log(`📡 Sending ${isSignup ? 'signup' : 'login'} request...`);
      
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, requestData);
      
      console.log('✅ Response:', response.data);
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('userId', response.data.user.userId);
      
      console.log(isSignup ? '✅ Account created successfully!' : '✅ Login successful!');
      
      // Trigger auth state change
      window.dispatchEvent(new Event('auth-state-changed'));
      
    } catch (err) {
      console.error('❌ Error:', err);
      
      if (err.response) {
        // Server responded with error
        setError(getErrorMessage(err.response.data.error));
      } else if (err.request) {
        setError('Cannot connect to server. Please check if backend is running.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    const errorMap = {
      'USER_EXISTS': 'This email is already registered. Please login instead.',
      'USER_NOT_FOUND': 'No account found with this email. Please sign up.',
      'INVALID_PASSWORD': 'Incorrect password. Please try again.',
      'INVALID_EMAIL': 'Please enter a valid email address.',
      'WEAK_PASSWORD': 'Password should be at least 6 characters.',
      'TOO_MANY_ATTEMPTS': 'Too many failed attempts. Please try again later.',
    };
    
    return errorMap[errorCode] || errorCode || 'An error occurred. Please try again.';
  };

  const resetForm = () => {
    setForm({
      name: '',
      surname: '',
      cell: '',
      email: '',
      password: '',
      emergencyContacts: [{ name: '', cell: '', email: '' }],
    });
    setError('');
  };

  const handleToggleMode = () => {
    setIsSignup(!isSignup);
    resetForm();
  };

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <img src={logo} alt="SafeMzansi Logo" className={styles.logo} />
        <h2>{isSignup ? 'Create Account' : 'Login to SafeMzansi'}</h2>

        {isSignup && (
          <>
            <div className={styles.row}>
              <input 
                name="name" 
                placeholder="First Name" 
                value={form.name} 
                onChange={handleChange} 
                required 
                disabled={isLoading}
              />
              <input 
                name="surname" 
                placeholder="Last Name" 
                value={form.surname} 
                onChange={handleChange} 
                required 
                disabled={isLoading}
              />
            </div>
            <input 
              name="cell" 
              placeholder="Cell Number" 
              value={form.cell} 
              onChange={handleChange} 
              required 
              disabled={isLoading}
            />
          </>
        )}

        <input 
          name="email" 
          type="email" 
          placeholder="Email address" 
          value={form.email} 
          onChange={handleChange} 
          required 
          disabled={isLoading}
        />
        <input 
          name="password" 
          type="password" 
          placeholder="Password" 
          value={form.password} 
          onChange={handleChange} 
          required 
          disabled={isLoading}
          minLength={6}
        />

        {isSignup && (
          <>
            <h4>Emergency Contacts</h4>
            {form.emergencyContacts.map((contact, index) => (
              <div key={index} className={styles.contactCard}>
                <input
                  name="emergency.name"
                  placeholder="Contact Name"
                  value={contact.name}
                  onChange={(e) => handleChange(e, index)}
                  required
                  disabled={isLoading}
                />
                <input
                  name="emergency.cell"
                  placeholder="Contact Cell Number"
                  value={contact.cell}
                  onChange={(e) => handleChange(e, index)}
                  required
                  disabled={isLoading}
                />
                <input
                  name="emergency.email"
                  type="email"
                  placeholder="Contact Email"
                  value={contact.email}
                  onChange={(e) => handleChange(e, index)}
                  required
                  disabled={isLoading}
                />
                {form.emergencyContacts.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeContact(index)}
                    disabled={isLoading}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              className={styles.addBtn} 
              onClick={addContact}
              disabled={isLoading}
            >
              + Add Another Contact
            </button>
          </>
        )}

        <button 
          type="submit" 
          className={styles.submitBtn}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner}></div>
              {isSignup ? 'Creating Account...' : 'Logging in...'}
            </div>
          ) : (
            isSignup ? 'Create Account' : 'Login'
          )}
        </button>

        <p className={styles.toggle} onClick={handleToggleMode}>
          {isSignup ? 'Already have an account? Login' : 'New user? Create an account'}
        </p>

        {error && <div className={styles.error}>{error}</div>}
      </form>
    </div>
  );
}