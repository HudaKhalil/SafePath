import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/routes';
    const response = await axios.get(backendUrl);
    return new Response(JSON.stringify(response.data), { status: response.status });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message || 'Failed to fetch routes from backend',
    }), { status: error.response?.status || 500 });
  }
}