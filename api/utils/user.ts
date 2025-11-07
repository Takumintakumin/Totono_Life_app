// 簡易的なユーザーID取得（実際のアプリでは認証システムを使用）
export function getUserId(req: any): string {
  // クエリパラメータまたはヘッダーからユーザーIDを取得
  // デモ用：実際には認証トークンから取得
  const userId = req.query?.userId || req.headers?.['x-user-id'] || 'default-user';
  return userId as string;
}

