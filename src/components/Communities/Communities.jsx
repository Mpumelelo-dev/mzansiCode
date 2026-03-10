import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Communities.scss';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Cape Town Areas Data
const capeTownAreas = [
  { name: "Cape Town CBD", suburb: "City Bowl", type: "Medium Risk", description: "Central business district with mixed commercial and residential areas" },
  { name: "Sea Point", suburb: "Atlantic Seaboard", type: "Low Risk", description: "Coastal suburb known for its promenade and safety initiatives" },
  { name: "Gardens", suburb: "City Bowl", type: "Low Risk", description: "Residential area near the city center with community watch programs" },
  { name: "Green Point", suburb: "Atlantic Seaboard", type: "Low Risk", description: "Waterfront area with strong neighborhood security" },
  { name: "Clifton", suburb: "Atlantic Seaboard", type: "Safe Zone", description: "Exclusive residential area with private security" },
  { name: "Camps Bay", suburb: "Atlantic Seaboard", type: "Low Risk", description: "Popular beach area with tourist safety measures" },
  { name: "Hout Bay", suburb: "Southern Suburbs", type: "Medium Risk", description: "Fishing village with mixed residential areas" },
  { name: "Constantia", suburb: "Southern Suburbs", type: "Safe Zone", description: "Upscale residential area with estate security" },
  { name: "Rondebosch", suburb: "Southern Suburbs", type: "Low Risk", description: "University area with student safety programs" },
  { name: "Newlands", suburb: "Southern Suburbs", type: "Low Risk", description: "Residential area near sports stadiums" },
  { name: "Claremont", suburb: "Southern Suburbs", type: "Medium Risk", description: "Commercial hub with shopping centers" },
  { name: "Wynberg", suburb: "Southern Suburbs", type: "Medium Risk", description: "Mixed residential and commercial area" },
  { name: "Athlone", suburb: "Cape Flats", type: "High Risk", description: "Residential area requiring community vigilance" },
  { name: "Gugulethu", suburb: "Cape Flats", type: "High Risk", description: "Township area with active community watch" },
  { name: "Khayelitsha", suburb: "Cape Flats", type: "High Risk", description: "Large township with safety initiatives" },
  { name: "Mitchells Plain", suburb: "Cape Flats", type: "High Risk", description: "Residential area with community patrols" },
  { name: "Bellville", suburb: "Northern Suburbs", type: "Medium Risk", description: "Commercial center with business security" },
  { name: "Durbanville", suburb: "Northern Suburbs", type: "Low Risk", description: "Family-oriented suburb with neighborhood watch" },
  { name: "Brackenfell", suburb: "Northern Suburbs", type: "Low Risk", description: "Suburban area with community safety" },
  { name: "Kraaifontein", suburb: "Northern Suburbs", type: "Medium Risk", description: "Growing residential area" },
  { name: "Table View", suburb: "West Coast", type: "Low Risk", description: "Coastal suburb with beach safety" },
  { name: "Blouberg", suburb: "West Coast", type: "Low Risk", description: "Beach area known for Table Mountain views" },
  { name: "Milnerton", suburb: "West Coast", type: "Medium Risk", description: "Residential area with lagoon access" },
  { name: "Parklands", suburb: "West Coast", type: "Low Risk", description: "Growing suburb with new developments" },
  { name: "Century City", suburb: "West Coast", type: "Safe Zone", description: "Gated community with private security" },
  { name: "Observatory", suburb: "Southern Suburbs", type: "Medium Risk", description: "Bohemian area with student population" },
  { name: "Mowbray", suburb: "Southern Suburbs", type: "Medium Risk", description: "University and hospital area" },
  { name: "Pinelands", suburb: "Southern Suburbs", type: "Low Risk", description: "Garden suburb with community spirit" },
  { name: "Langa", suburb: "Cape Flats", type: "High Risk", description: "Historic township with community programs" },
  { name: "Nyanga", suburb: "Cape Flats", type: "High Risk", description: "Township area with safety challenges" }
];

// Safety Kit Component
const SafetyKitSection = () => {
  const safetyKits = [
    {
      name: "Personal Safety Alarm",
      description: "Loud 130dB personal alarm with LED strobe light",
      price: "R 249",
      originalPrice: "R 299",
      discount: "17% OFF",
      supplier: "SafetyGear SA",
      link: "https://safetygearsa.co.za/products/personal-safety-alarm",
      code: "SAFEMZANSI17",
      image: "🔊",
      category: "personal"
    },
    {
      name: "Emergency Whistle & Light",
      description: "Waterproof whistle with built-in LED flashlight",
      price: "R 189",
      originalPrice: "R 220",
      discount: "14% OFF",
      supplier: "SecureLiving",
      link: "https://secureliving.co.za/products/emergency-whistle-light",
      code: "SAFE14",
      image: "📣",
      category: "outdoor"
    },
    {
      name: "First Aid Kit Compact",
      description: "Portable first aid kit for everyday emergencies",
      price: "R 399",
      originalPrice: "R 450",
      discount: "11% OFF",
      supplier: "MediReady SA",
      link: "https://medireadysa.co.za/products/compact-first-aid-kit",
      code: "READY11",
      image: "🩹",
      category: "medical"
    },
    {
      name: "Vehicle Safety Pack",
      description: "Car emergency kit with tools and supplies",
      price: "R 599",
      originalPrice: "R 699",
      discount: "14% OFF",
      supplier: "AutoSecure",
      link: "https://autosecure.co.za/products/vehicle-safety-pack",
      code: "VEHICLE14",
      image: "🚗",
      category: "vehicle"
    },
    {
      name: "Home Safety Bundle",
      description: "Essential home safety equipment package",
      price: "R 899",
      originalPrice: "R 1099",
      discount: "18% OFF",
      supplier: "HomeGuard SA",
      link: "https://homeguardsa.co.za/products/safety-bundle",
      code: "HOME18",
      image: "🏠",
      category: "home"
    },
    {
      name: "Mobile Power Bank + Light",
      description: "10000mAh power bank with emergency light",
      price: "R 349",
      originalPrice: "R 420",
      discount: "17% OFF",
      supplier: "PowerTech SA",
      link: "https://powertechsa.co.za/products/emergency-power-bank",
      code: "POWER17",
      image: "🔋",
      category: "electronics"
    }
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Kits', icon: '🛍️' },
    { id: 'personal', name: 'Personal', icon: '👤' },
    { id: 'home', name: 'Home', icon: '🏠' },
    { id: 'vehicle', name: 'Vehicle', icon: '🚗' },
    { id: 'medical', name: 'Medical', icon: '🩹' },
    { id: 'outdoor', name: 'Outdoor', icon: '🌳' }
  ];

  const filteredKits = selectedCategory === 'all' 
    ? safetyKits 
    : safetyKits.filter(kit => kit.category === selectedCategory);

  return (
    <div className="safety-kit-section">
      <div className="section-header">
        <h3>🛡️ Safety Kits & Equipment</h3>
        <p>Get prepared with essential safety gear at discounted prices</p>
      </div>

      {/* Category Filters */}
      <div className="safety-categories">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Safety Kits Grid */}
      <div className="safety-kits-grid">
        {filteredKits.map((kit, index) => (
          <div key={index} className="safety-kit-card">
            <div className="kit-header">
              <div className="kit-image">{kit.image}</div>
              <div className="kit-discount-badge">{kit.discount}</div>
            </div>
            
            <div className="kit-content">
              <h4 className="kit-name">{kit.name}</h4>
              <p className="kit-description">{kit.description}</p>
              
              <div className="kit-supplier">
                <span className="supplier-label">Supplier:</span>
                <span className="supplier-name">{kit.supplier}</span>
              </div>
              
              <div className="kit-pricing">
                <span className="current-price">{kit.price}</span>
                <span className="original-price">{kit.originalPrice}</span>
              </div>
              
              <div className="discount-code">
                <span className="code-label">Use code:</span>
                <span className="code-value">{kit.code}</span>
              </div>
            </div>
            
            <div className="kit-actions">
              <a 
                href={kit.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="buy-now-btn"
              >
                🛒 Buy Now
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Safety Tips Component
const SafetyTipsSection = () => {
  const safetyTips = [
    {
      category: "Personal Safety",
      icon: "👤",
      tips: [
        "Always be aware of your surroundings and avoid distractions",
        "Share your live location with trusted contacts when traveling",
        "Keep emergency numbers saved on speed dial",
        "Trust your instincts - if something feels wrong, it probably is",
        "Avoid walking alone in poorly lit areas at night"
      ]
    },
    {
      category: "Home Safety",
      icon: "🏠",
      tips: [
        "Install proper lighting around your property",
        "Keep doors and windows locked, even when home",
        "Get to know your neighbors and build community watch",
        "Don't advertise when you'll be away from home",
        "Keep emergency numbers visible near phones"
      ]
    },
    {
      category: "Vehicle Safety",
      icon: "🚗",
      tips: [
        "Always check your surroundings before entering/exiting vehicle",
        "Keep doors locked while driving",
        "Park in well-lit, secure areas",
        "Have your keys ready before approaching your vehicle",
        "Keep your vehicle maintained and fuel tank at least half full"
      ]
    },
    {
      category: "Emergency Preparedness",
      icon: "🆘",
      tips: [
        "Create a family emergency plan and meeting points",
        "Keep important documents in a safe, accessible place",
        "Have emergency contacts saved in multiple locations",
        "Learn basic first aid and CPR",
        "Keep emergency cash and supplies readily available"
      ]
    },
    {
      category: "Digital Safety",
      icon: "📱",
      tips: [
        "Use strong, unique passwords for all accounts",
        "Enable two-factor authentication where possible",
        "Be cautious about sharing location on social media",
        "Keep emergency information accessible on your phone lock screen",
        "Regularly update your privacy settings on apps"
      ]
    },
    {
      category: "Community Safety",
      icon: "👥",
      tips: [
        "Participate in local neighborhood watch programs",
        "Report suspicious activities to authorities",
        "Share safety information with neighbors",
        "Organize community safety awareness events",
        "Support local safety initiatives and campaigns"
      ]
    }
  ];

  const [expandedCategory, setExpandedCategory] = useState(null);

  return (
    <div className="safety-tips-section">
      <div className="section-header">
        <h3>💡 Safety Tips & Guidelines</h3>
        <p>Essential knowledge to keep you and your community safe</p>
      </div>

      <div className="safety-tips-grid">
        {safetyTips.map((category, index) => (
          <div 
            key={index} 
            className={`safety-tip-category ${expandedCategory === index ? 'expanded' : ''}`}
          >
            <div 
              className="category-header"
              onClick={() => setExpandedCategory(expandedCategory === index ? null : index)}
            >
              <div className="category-icon">{category.icon}</div>
              <h4 className="category-title">{category.category}</h4>
              <div className="expand-icon">
                {expandedCategory === index ? '▲' : '▼'}
              </div>
            </div>
            
            {expandedCategory === index && (
              <div className="category-tips">
                <ul className="tips-list">
                  {category.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="tip-item">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Post Component (Updated for SafeMzansi)
const PostComponent = ({ 
  post, 
  user, 
  activePost, 
  replyContent, 
  replying, 
  postTypes, 
  onLikePost, 
  onToggleExpansion, 
  onAddComment, 
  onSetReplyContent, 
  formatSocialTime,
  isFirst 
}) => {
  const [localLikes, setLocalLikes] = useState(post.likes || []);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (!user) {
      alert('Please log in to like posts');
      return;
    }
    
    if (isLiking) return;
    
    setIsLiking(true);
    const wasLiked = localLikes.includes(user.userId);
    const newLikes = wasLiked 
      ? localLikes.filter(id => id !== user.userId)
      : [...localLikes, user.userId];
    
    setLocalLikes(newLikes);
    
    try {
      await onLikePost(post.id, post.likes || [], user.userId);
    } catch (error) {
      setLocalLikes(post.likes || []);
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async () => {
    await onAddComment(post.id);
  };

  return (
    <div className={`social-post enhanced ${isFirst ? 'first-post' : ''}`}>
      <div className="post-header enhanced">
        <div className="user-info">
          <div 
            className="user-avatar enhanced"
            style={{ 
              backgroundColor: postTypes[post.type]?.color || '#2563eb'
            }}
          >
            {post.userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <div className="username-row">
              <span className="username">{post.userName}</span>
              <span 
                className="post-type-badge"
                style={{ backgroundColor: postTypes[post.type]?.color }}
              >
                {postTypes[post.type]?.icon} {postTypes[post.type]?.label}
              </span>
            </div>
            <span className="post-meta">
              {formatSocialTime(post.timestamp)}
              {post.area && <span className="post-area"> • 📍 {post.area}</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="post-content enhanced">
        {post.title && post.title !== `${postTypes[post.type]?.label} - ${post.area}` && (
          <h4 className="post-title">{post.title}</h4>
        )}
        <p>{post.content}</p>
        {post.image && (
          <div className="post-image">
            <img src={post.image} alt="Post visual" loading="lazy" />
          </div>
        )}
      </div>

      <div className="post-engagement enhanced">
        <button 
          className={`engagement-btn like-btn ${localLikes.includes(user?.userId) ? 'liked' : ''} ${isLiking ? 'liking' : ''}`}
          onClick={handleLike}
          disabled={isLiking}
        >
          <span className="btn-icon">
            {localLikes.includes(user?.userId) ? '❤️' : '🤍'}
          </span>
          <span className="btn-count">{localLikes.length}</span>
        </button>
        <button 
          className={`engagement-btn comment-btn ${activePost === post.id ? 'active' : ''}`}
          onClick={() => onToggleExpansion(post.id)}
        >
          <span className="btn-icon">💬</span>
          <span className="btn-count">{post.replies?.length || 0}</span>
        </button>
      </div>

      {activePost === post.id && (
        <div className="comments-section enhanced">
          {post.replies && post.replies.length > 0 && (
            <div className="comments-list">
              <div className="comments-header">
                <h5>Community Discussion ({post.replies.length})</h5>
              </div>
              {post.replies.map((comment, index) => (
                <div key={comment.id || index} className="comment enhanced">
                  <div 
                    className="comment-avatar"
                    style={{
                      backgroundColor: '#2563eb'
                    }}
                  >
                    {comment.userName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-username">{comment.userName}</span>
                      <span className="comment-time">{formatSocialTime(comment.timestamp)}</span>
                    </div>
                    <p className="comment-text">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {user ? (
            <div className="comment-input-section enhanced">
              <div className="comment-input-wrapper">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={replyContent[post.id] || ''}
                  onChange={(e) => onSetReplyContent({
                    ...replyContent,
                    [post.id]: e.target.value
                  })}
                  className="comment-input"
                  disabled={replying[post.id]}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <button 
                  onClick={handleAddComment}
                  disabled={!replyContent[post.id]?.trim() || replying[post.id]}
                  className="send-comment-btn enhanced"
                >
                  {replying[post.id] ? '...' : 'Post'}
                </button>
              </div>
            </div>
          ) : (
            <div className="login-prompt">
              <p>Please log in to join the conversation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SafeMzansiCommunity = ({ onClose, currentLocation }) => {
  const [selectedArea, setSelectedArea] = useState(null);
  const [filteredAreas, setFilteredAreas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [activeTab, setActiveTab] = useState('explore');
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ 
    title: '', 
    content: '',
    type: 'incident',
    image: '',
    imageFile: null
  });
  const [replyContent, setReplyContent] = useState({});
  const [userWatchAreas, setUserWatchAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replying, setReplying] = useState({});
  const [user, setUser] = useState(null);
  const [activePost, setActivePost] = useState(null);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [initialized, setInitialized] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedSuburb, setSelectedSuburb] = useState('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Use Cape Town areas as default
  const safetyAreas = capeTownAreas;

  // Post types for SafeMzansi
  const postTypes = {
    incident: { icon: '🚨', label: 'Incident', color: '#dc2626' },
    alert: { icon: '⚠️', label: 'Alert', color: '#ea580c' },
    safety: { icon: '🛡️', label: 'Safety Tip', color: '#16a34a' },
    community: { icon: '👥', label: 'Community', color: '#2563eb' },
    update: { icon: '📢', label: 'Update', color: '#7c3aed' },
    positive: { icon: '🌟', label: 'Positive News', color: '#ca8a04' }
  };

  // SafeHub Tabs
  const safeHubTabs = [
    { id: 'community', label: 'Community Feed', icon: '👥' },
    { id: 'safetyTips', label: 'Safety Tips', icon: '💡' },
    { id: 'safetyKit', label: 'Safety Kits', icon: '🛡️' }
  ];
  const [activeHubTab, setActiveHubTab] = useState('community');

  // Get unique suburbs and risk levels for filters
  const suburbs = ['all', ...new Set(safetyAreas.map(area => area.suburb))];
  const riskLevels = ['all', ...new Set(safetyAreas.map(area => area.type))];

  // Load user from localStorage (from AuthForm)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Load user's watch areas from localStorage
        const storedWatchAreas = localStorage.getItem(`watchAreas_${userData.userId}`);
        if (storedWatchAreas) {
          setUserWatchAreas(JSON.parse(storedWatchAreas));
        } else {
          // Initialize empty watch areas
          localStorage.setItem(`watchAreas_${userData.userId}`, JSON.stringify([]));
          setUserWatchAreas([]);
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
      }
    }
    setInitialized(true);

    // Listen for auth changes
    const handleAuthChange = () => {
      const updatedUser = localStorage.getItem('user');
      if (updatedUser) {
        setUser(JSON.parse(updatedUser));
      } else {
        setUser(null);
        setUserWatchAreas([]);
      }
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthChange);
  }, []);

  // Save watch areas to localStorage whenever they change
  useEffect(() => {
    if (user && userWatchAreas.length >= 0) {
      localStorage.setItem(`watchAreas_${user.userId}`, JSON.stringify(userWatchAreas));
    }
  }, [userWatchAreas, user]);

  // Load posts from localStorage
  useEffect(() => {
    if (!initialized) return;

    // Load posts from localStorage
    const storedPosts = localStorage.getItem('communityPosts');
    if (storedPosts) {
      try {
        const parsedPosts = JSON.parse(storedPosts);
        
        // Filter posts based on active tab and selected area
        let filteredPosts = parsedPosts;
        
        if (activeHubTab === 'community') {
          if (activeTab === 'feed' && selectedArea) {
            filteredPosts = parsedPosts.filter(post => post.area === selectedArea.name);
          } else if (activeTab === 'global') {
            // Show all posts for global feed
            filteredPosts = parsedPosts;
          } else {
            filteredPosts = [];
          }
        } else {
          filteredPosts = [];
        }
        
        // Sort by timestamp descending (newest first)
        filteredPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setPosts(filteredPosts);
      } catch (error) {
        console.error('Error loading posts:', error);
        setPosts([]);
      }
    } else {
      // Initialize with empty posts array
      localStorage.setItem('communityPosts', JSON.stringify([]));
      setPosts([]);
    }
  }, [selectedArea, activeTab, initialized, activeHubTab]);

  // Save posts to localStorage
  const savePosts = (newPosts) => {
    const allPosts = JSON.parse(localStorage.getItem('communityPosts') || '[]');
    const updatedPosts = [...allPosts, ...newPosts];
    localStorage.setItem('communityPosts', JSON.stringify(updatedPosts));
  };

  // Image upload function (simulated for now - you can implement actual upload later)
  const uploadImage = async (file) => {
    if (!file) return null;
    
    try {
      setUploadingImage(true);
      
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      }
      
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Image size must be less than 5MB');
      }
      
      // For now, create a local URL (in production, upload to OBS)
      const imageUrl = URL.createObjectURL(file);
      return imageUrl;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image size must be less than 5MB');
      return;
    }

    const previewURL = URL.createObjectURL(file);
    setNewPost(prev => ({
      ...prev,
      image: previewURL,
      imageFile: file
    }));
  };

  // Remove selected image
  const removeImage = () => {
    if (newPost.image && newPost.image.startsWith('blob:')) {
      URL.revokeObjectURL(newPost.image);
    }
    setNewPost(prev => ({
      ...prev,
      image: '',
      imageFile: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset form
  const resetPostForm = () => {
    if (newPost.image && newPost.image.startsWith('blob:')) {
      URL.revokeObjectURL(newPost.image);
    }
    
    setNewPost({ 
      title: '', 
      content: '', 
      type: 'incident', 
      image: '', 
      imageFile: null 
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    setShowNewPostForm(false);
  };

  // Create post function
  const createPost = async () => {
    if (!newPost.content.trim() || !selectedArea || !user) {
      alert('Please fill in all required fields');
      return;
    }

    if (!isWatching(selectedArea.name)) {
      alert('Please add this area to your watch list to share updates');
      return;
    }

    setLoading(true);
    let imageUrl = '';
    
    try {
      if (newPost.imageFile) {
        imageUrl = await uploadImage(newPost.imageFile);
        if (!imageUrl) {
          alert('Image upload failed. Please try again.');
          setLoading(false);
          return;
        }
      }

      const postData = {
        id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        area: selectedArea.name,
        title: newPost.title.trim() || `${postTypes[newPost.type].label} - ${selectedArea.name}`,
        content: newPost.content.trim(),
        userId: user.userId,
        userEmail: user.email,
        userName: user.name || user.email.split('@')[0],
        timestamp: new Date().toISOString(),
        type: newPost.type,
        replies: [],
        likes: [],
        image: imageUrl
      };

      // Save to localStorage
      const existingPosts = JSON.parse(localStorage.getItem('communityPosts') || '[]');
      existingPosts.push(postData);
      localStorage.setItem('communityPosts', JSON.stringify(existingPosts));
      
      // Update current posts
      setPosts(prev => [postData, ...prev]);
      
      resetPostForm();
      alert('Post shared successfully!');
      
    } catch (error) {
      console.error('Error creating post:', error);
      alert(error.message || 'Failed to share post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add area to watch list
  const watchArea = async (areaName) => {
    if (!user) {
      alert('Please log in to watch an area');
      return;
    }

    try {
      const updatedWatchAreas = [...userWatchAreas, areaName];
      setUserWatchAreas(updatedWatchAreas);
      
      const watchedArea = safetyAreas.find(area => area.name === areaName);
      if (watchedArea) {
        setSelectedArea(watchedArea);
        setActiveTab('feed');
      }

    } catch (error) {
      console.error('Error watching area:', error);
      alert('Failed to watch area');
    }
  };

  // Remove area from watch list
  const unwatchArea = async (areaName) => {
    if (!user) return;

    try {
      const updatedWatchAreas = userWatchAreas.filter(name => name !== areaName);
      setUserWatchAreas(updatedWatchAreas);
      
      if (selectedArea && selectedArea.name === areaName) {
        setSelectedArea(null);
        if (updatedWatchAreas.length === 0) {
          setActiveTab('explore');
        }
      }

    } catch (error) {
      console.error('Error unwatching area:', error);
    }
  };

  // Filter areas based on search, suburb, and risk level
  useEffect(() => {
    if (safetyAreas && initialized) {
      let filtered = [...safetyAreas];
      
      // Search filter
      if (searchTerm) {
        filtered = filtered.filter(area =>
          area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          area.suburb.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Suburb filter
      if (selectedSuburb !== 'all') {
        filtered = filtered.filter(area => area.suburb === selectedSuburb);
      }
      
      // Risk level filter
      if (selectedRiskLevel !== 'all') {
        filtered = filtered.filter(area => area.type === selectedRiskLevel);
      }
      
      // Sort
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'name': return a.name.localeCompare(b.name);
          case 'suburb': return a.suburb.localeCompare(b.suburb);
          case 'risk': 
            const riskOrder = { 'Safe Zone': 1, 'Low Risk': 2, 'Medium Risk': 3, 'High Risk': 4 };
            return riskOrder[a.type] - riskOrder[b.type];
          default: return 0;
        }
      });
      
      setFilteredAreas(filtered);
    }
  }, [safetyAreas, searchTerm, sortBy, initialized, selectedSuburb, selectedRiskLevel]);

  // Check if user is watching an area
  const isWatching = (areaName) => {
    return userWatchAreas.includes(areaName);
  };

  // Get watcher count (simulated)
  const getWatcherCount = (areaName) => {
    return Math.floor(Math.random() * 10) + 1; // Random count for demo
  };

  // Like post
  const likePost = async (postId, currentLikes = [], userId) => {
    if (!user) return;

    try {
      const existingPosts = JSON.parse(localStorage.getItem('communityPosts') || '[]');
      const postIndex = existingPosts.findIndex(p => p.id === postId);
      
      if (postIndex !== -1) {
        const hasLiked = currentLikes.includes(userId);
        
        if (hasLiked) {
          existingPosts[postIndex].likes = currentLikes.filter(id => id !== userId);
        } else {
          existingPosts[postIndex].likes = [...currentLikes, userId];
        }
        
        localStorage.setItem('communityPosts', JSON.stringify(existingPosts));
        
        // Update current posts
        setPosts(prev => prev.map(p => 
          p.id === postId ? existingPosts[postIndex] : p
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  // Add comment
  const addComment = async (postId) => {
    const commentText = replyContent[postId];
    if (!commentText?.trim() || !user) return;

    setReplying(prev => ({ ...prev, [postId]: true }));

    try {
      const existingPosts = JSON.parse(localStorage.getItem('communityPosts') || '[]');
      const postIndex = existingPosts.findIndex(p => p.id === postId);
      
      if (postIndex !== -1) {
        const comment = {
          id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: commentText.trim(),
          userId: user.userId,
          userName: user.name || user.email.split('@')[0],
          timestamp: new Date().toISOString()
        };

        if (!existingPosts[postIndex].replies) {
          existingPosts[postIndex].replies = [];
        }
        
        existingPosts[postIndex].replies.push(comment);
        localStorage.setItem('communityPosts', JSON.stringify(existingPosts));
        
        // Update current posts
        setPosts(prev => prev.map(p => 
          p.id === postId ? existingPosts[postIndex] : p
        ));
        
        setReplyContent(prev => ({ ...prev, [postId]: '' }));
      }
      
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setReplying(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Format time
  const formatSocialTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  // Toggle post expansion
  const togglePostExpansion = (postId) => {
    setActivePost(activePost === postId ? null : postId);
  };

  // Filter posts by type
  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'all') return true;
    return post.type === activeFilter;
  });

  // Handle area switch
  const handleSwitchArea = (areaName) => {
    const area = safetyAreas.find(safetyArea => safetyArea.name === areaName);
    if (area) {
      setSelectedArea(area);
    }
  };

  // Quick join function for dropdown
  const handleQuickJoin = (areaName) => {
    if (!user) {
      alert('Please log in to join an area');
      return;
    }
    watchArea(areaName);
  };

  // Render SafeHub content based on active tab
  const renderSafeHubContent = () => {
    switch (activeHubTab) {
      case 'safetyTips':
        return <SafetyTipsSection />;
      case 'safetyKit':
        return <SafetyKitSection />;
      case 'community':
      default:
        return renderCommunityContent();
    }
  };

  // Render community content
  const renderCommunityContent = () => (
    <>
      {/* Community Tabs */}
      <div className="community-tabs enhanced">
        <button 
          className={`community-tab ${activeTab === 'explore' ? 'active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          <span className="tab-icon">🗺️</span>
          <span className="tab-text">Explore Areas</span>
        </button>
        
        <button 
          className={`community-tab ${activeTab === 'feed' ? 'active' : ''} ${userWatchAreas.length === 0 ? 'disabled-tab' : ''}`}
          onClick={() => {
            if (userWatchAreas.length > 0) {
              setActiveTab('feed');
              if (!selectedArea && userWatchAreas.length > 0) {
                const firstWatched = safetyAreas?.find(area => area.name === userWatchAreas[0]);
                if (firstWatched) setSelectedArea(firstWatched);
              }
            } else {
              alert('Please add an area to your watch list first!');
            }
          }}
        >
          <span className="tab-icon">📱</span>
          <span className="tab-text">My Area Feed</span>
          {userWatchAreas.length > 0 && (
            <span className="notification-badge">{userWatchAreas.length}</span>
          )}
        </button>
        
        <button 
          className={`community-tab ${activeTab === 'global' ? 'active' : ''}`}
          onClick={() => setActiveTab('global')}
        >
          <span className="tab-icon">🌍</span>
          <span className="tab-text">National Feed</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="community-content enhanced">
        {activeTab === 'explore' ? (
          <>
            {/* Areas Grid */}
            <div className="areas-grid-section enhanced">
              <div className="section-header enhanced">
                <h3>Cape Town Safety Watch Areas</h3>
                <div className="header-controls enhanced">
                  <div className="quick-join-section">
                    <select 
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleQuickJoin(e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="quick-join-dropdown"
                    >
                      <option value="">Quick Join Area...</option>
                      {safetyAreas.map(area => (
                        <option key={area.name} value={area.name}>
                          {area.name} ({area.suburb}) - {area.type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Search areas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <select 
                    value={selectedSuburb}
                    onChange={(e) => setSelectedSuburb(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Suburbs</option>
                    {suburbs.filter(suburb => suburb !== 'all').map(suburb => (
                      <option key={suburb} value={suburb}>{suburb}</option>
                    ))}
                  </select>
                  <select 
                    value={selectedRiskLevel}
                    onChange={(e) => setSelectedRiskLevel(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Risk Levels</option>
                    {riskLevels.filter(level => level !== 'all').map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="suburb">Sort by Suburb</option>
                    <option value="risk">Sort by Risk Level</option>
                  </select>
                </div>
              </div>
              
              <div className="areas-grid enhanced">
                {filteredAreas.map((area) => {
                  const isWatched = isWatching(area.name);
                  const watcherCount = getWatcherCount(area.name);
                  
                  return (
                    <div key={area.name} className={`area-card enhanced ${isWatched ? 'watched' : ''}`}>
                      <div className="card-header enhanced">
                        <div className="area-type-badge">
                          {getAreaSafetyIcon(area.type)} 
                          <span>{area.type}</span>
                        </div>
                        <div className="watch-info">
                          <span className="watcher-count">👥 {watcherCount}</span>
                          {isWatched && <span className="you-watched-badge">✓ Watching</span>}
                        </div>
                      </div>
                      
                      <div className="card-body enhanced">
                        <h4 className="area-name">{area.name}</h4>
                        <p className="area-location">📍 {area.suburb}</p>
                        <p className="area-description">
                          {area.description}
                        </p>
                      </div>

                      <div className="card-footer enhanced">
                        {isWatched ? (
                          <div className="watch-actions enhanced">
                            <button 
                              className="action-btn primary"
                              onClick={() => {
                                setSelectedArea(area);
                                setActiveTab('feed');
                              }}
                            >
                              📱 View Feed
                            </button>
                            <button 
                              className="action-btn secondary"
                              onClick={() => unwatchArea(area.name)}
                            >
                              Unwatch
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="action-btn watch-btn enhanced"
                            onClick={() => watchArea(area.name)}
                          >
                            👁️ Watch This Area
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Feed Content */
          <div className="social-feed enhanced">
            
            {/* Feed Header */}
            {activeTab === 'feed' && selectedArea && (
              <div className="feed-header-enhanced">
                <div className="current-area-info enhanced">
                  <div className="area-avatar enhanced">
                    {getAreaSafetyIcon(selectedArea.type)}
                  </div>
                  <div className="area-details enhanced">
                    <h3 className="area-name-title">{selectedArea.name}</h3>
                    <div className="area-meta">
                      <span className="meta-item">
                        <span className="meta-icon">📍</span>
                        {selectedArea.suburb}
                      </span>
                      <span className="meta-item">
                        <span className="meta-icon">🛡️</span>
                        {selectedArea.type}
                      </span>
                    </div>
                  </div>
                  <div className="area-actions">
                    {isWatching(selectedArea.name) && (
                      <button 
                        className="create-post-btn enhanced"
                        onClick={() => setShowNewPostForm(true)}
                      >
                        <span className="btn-icon">📝</span>
                        <span className="btn-text">Create Post</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Area Switcher */}
                {userWatchAreas.length > 1 && (
                  <div className="area-switcher enhanced">
                    <div className="switcher-header">
                      <span className="switcher-label">Switch Area:</span>
                    </div>
                    <select 
                      value={selectedArea?.name || ''}
                      onChange={(e) => handleSwitchArea(e.target.value)}
                      className="area-select enhanced"
                    >
                      {userWatchAreas.map(areaName => (
                        <option key={areaName} value={areaName}>
                          {areaName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Feed Controls */}
            {(activeTab === 'feed' || activeTab === 'global') && (
              <div className="feed-controls enhanced">
                <div className="post-filters enhanced">
                  <button 
                    className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    All
                  </button>
                  {Object.entries(postTypes).map(([key, { icon, label }]) => (
                    <button 
                      key={key}
                      className={`filter-btn ${activeFilter === key ? 'active' : ''}`}
                      onClick={() => setActiveFilter(key)}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Posts Feed */}
            <div className="posts-feed-container enhanced">
              <div className="posts-feed enhanced">
                {activeTab === 'feed' && (!selectedArea || userWatchAreas.length === 0) ? (
                  <div className="empty-feed enhanced">
                    <div className="empty-icon">📱</div>
                    <h4>Watch an Area to Unlock Your Feed!</h4>
                    <p>Your personalized safety feed will appear here once you add an area to your watch list</p>
                    <button 
                      className="primary-action-btn"
                      onClick={() => setActiveTab('explore')}
                    >
                      🗺️ Explore Areas
                    </button>
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="empty-feed enhanced">
                    <div className="empty-icon">
                      {activeTab === 'feed' ? '📝' : '🌍'}
                    </div>
                    <h4>
                      {activeTab === 'feed' 
                        ? `No posts yet in ${selectedArea?.name}`
                        : 'No national posts yet'
                      }
                    </h4>
                    <p>
                      {activeTab === 'feed' && isWatching(selectedArea?.name)
                        ? 'Be the first to share safety updates!'
                        : 'Be the first to share safety information!'
                      }
                    </p>
                    {activeTab === 'feed' && isWatching(selectedArea?.name) && (
                      <button 
                        className="start-posting-btn enhanced"
                        onClick={() => setShowNewPostForm(true)}
                      >
                        📝 Share First Update
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="posts-container">
                    {filteredPosts.map((post, index) => (
                      <PostComponent 
                        key={post.id}
                        post={post}
                        user={user}
                        activePost={activePost}
                        replyContent={replyContent}
                        replying={replying}
                        postTypes={postTypes}
                        onLikePost={likePost}
                        onToggleExpansion={togglePostExpansion}
                        onAddComment={addComment}
                        onSetReplyContent={setReplyContent}
                        formatSocialTime={formatSocialTime}
                        isFirst={index === 0}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="safe-mzansi-community enhanced">
      {/* Header */}
      <div className="community-header enhanced">
        <div className="header-content">
          <div className="header-title">
            <h2>SafeMzansi Community</h2>
            <p>Your Safety Hub for South Africa</p>
          </div>
          <div className="header-stats">
            <div className="header-stat">
              <span className="stat-number">{userWatchAreas.length}</span>
              <span className="stat-label">Watched Areas</span>
            </div>
            <button className="close-btn enhanced" onClick={onClose}>
              <span>×</span>
            </button>
          </div>
        </div>
      </div>

      {/* SafeHub Tabs */}
      <div className="safehub-tabs enhanced">
        {safeHubTabs.map(tab => (
          <button
            key={tab.id}
            className={`safehub-tab ${activeHubTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveHubTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-text">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SafeHub Content */}
      <div className="safehub-content">
        {renderSafeHubContent()}
      </div>

      {/* Create Post Modal */}
      {showNewPostForm && (
        <div className="create-post-modal enhanced">
          <div className="modal-backdrop" onClick={resetPostForm}></div>
          <div className="modal-content">
            <div className="modal-header enhanced">
              <h3>Share Safety Update for {selectedArea?.name}</h3>
              <button 
                className="close-modal enhanced"
                onClick={resetPostForm}
              >
                ×
              </button>
            </div>
            
            <div className="post-form enhanced">
              {/* Post Type Selection */}
              <div className="form-group">
                <label className="form-label">Update Type</label>
                <div className="post-type-grid">
                  {Object.entries(postTypes).map(([key, { icon, label, color }]) => (
                    <button
                      key={key}
                      type="button"
                      className={`post-type-option ${newPost.type === key ? 'selected' : ''}`}
                      onClick={() => setNewPost({...newPost, type: key})}
                      style={{ 
                        borderColor: newPost.type === key ? color : '#e0e0e0',
                        backgroundColor: newPost.type === key ? `${color}15` : 'white'
                      }}
                    >
                      <span className="post-type-icon">{icon}</span>
                      <span className="post-type-label">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Content Input */}
              <div className="form-group">
                <label className="form-label">Your Safety Update</label>
                <textarea
                  placeholder={`Share safety information about ${selectedArea?.name}...\n• Recent incidents\n• Safety alerts\n• Helpful tips\n• Community events`}
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  className="post-content-input"
                  rows="5"
                  maxLength="500"
                />
                <div className="character-count">
                  {newPost.content.length}/500
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="form-group">
                <label className="form-label">Add Photo (Optional)</label>
                <div className="image-upload-section">
                  {!newPost.image ? (
                    <div className="image-upload-card">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="image-input"
                        id="post-image-input"
                      />
                      <label htmlFor="post-image-input" className="image-upload-area">
                        <div className="upload-icon-wrapper">
                          <span className="upload-icon">📷</span>
                        </div>
                        <div className="upload-text">
                          <span className="upload-title">Add a photo</span>
                          <span className="upload-subtitle">JPEG, PNG, GIF, WebP • Max 5MB</span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="image-preview-card">
                      <div className="preview-header">
                        <span className="preview-title">Photo Preview</span>
                        <button 
                          type="button" 
                          onClick={removeImage}
                          className="remove-image-btn"
                        >
                          × Remove
                        </button>
                      </div>
                      <div className="preview-content">
                        <img src={newPost.image} alt="Preview" className="preview-image" />
                        <div className="preview-actions">
                          <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="change-image-btn"
                          >
                            📷 Change Photo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Post Actions */}
              <div className="post-actions enhanced">
                <div className="action-buttons">
                  <button 
                    onClick={resetPostForm}
                    disabled={loading || uploadingImage}
                    className="cancel-btn"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createPost}
                    disabled={loading || uploadingImage || !newPost.content.trim()}
                    className="post-btn enhanced"
                    type="button"
                  >
                    {uploadingImage ? (
                      <>
                        <span className="loading-spinner"></span>
                        Uploading Image...
                      </>
                    ) : loading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Sharing Update...
                      </>
                    ) : (
                      `📝 Share ${postTypes[newPost.type].label}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for area safety icons
const getAreaSafetyIcon = (type) => {
  switch (type) {
    case "High Risk": return "🔴";
    case "Medium Risk": return "🟡";
    case "Low Risk": return "🟢";
    case "Community Watch": return "👥";
    case "Safe Zone": return "🛡️";
    default: return "📍";
  }
};

export default SafeMzansiCommunity;