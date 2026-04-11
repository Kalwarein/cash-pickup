import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Legacy Dashboard - redirects to /home
const Dashboard = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/home', { replace: true }); }, [navigate]);
  return null;
};

export default Dashboard;