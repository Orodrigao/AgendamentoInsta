// api/buffer.js
// Proxy para a API do Buffer — resolve o problema de CORS
 
export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
 
  const { action, access_token } = req.body || req.query;
 
  if (!access_token) {
    return res.status(400).json({ error: 'access_token obrigatório' });
  }
 
  try {
    // GET profiles (buscar contas)
    if (req.method === 'GET' || action === 'profiles') {
      const response = await fetch(
        `https://api.bufferapp.com/1/profiles.json?access_token=${access_token}`
      );
      const data = await response.json();
      return res.status(response.status).json(data);
    }
 
    // POST create update (agendar post)
    if (req.method === 'POST' && action === 'schedule') {
      const { text, scheduled_at, profile_ids, media_photo } = req.body;
 
      const params = new URLSearchParams();
      params.append('text', text);
      params.append('scheduled_at', scheduled_at);
      params.append('access_token', access_token);
 
      if (Array.isArray(profile_ids)) {
        profile_ids.forEach(id => params.append('profile_ids[]', id));
      } else if (profile_ids) {
        params.append('profile_ids[]', profile_ids);
      }
 
      if (media_photo) {
        params.append('media[photo]', media_photo);
      }
 
      const response = await fetch(
        'https://api.bufferapp.com/1/updates/create.json',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        }
      );
 
      const data = await response.json();
      return res.status(response.status).json(data);
    }
 
    return res.status(400).json({ error: 'Ação não reconhecida' });
 
  } catch (error) {
    console.error('Buffer proxy error:', error);
    return res.status(500).json({ error: 'Erro interno ao conectar com Buffer', detail: error.message });
  }
}
