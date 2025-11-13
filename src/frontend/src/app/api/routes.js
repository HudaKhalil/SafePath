import axios from 'axios';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Forward request to backend server
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/routes';
      const response = await axios.get(backendUrl);
      res.status(response.status).json(response.data);
    } catch (error) {
      res.status(error.response?.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch routes from backend',
      });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}
