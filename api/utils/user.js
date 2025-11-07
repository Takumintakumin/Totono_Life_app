export function getUserId(req) {
  const userId = (req.query && req.query.userId) || (req.headers && req.headers['x-user-id']) || 'default-user';
  return userId;
}
