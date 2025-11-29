import { Router, Request, Response } from 'express';
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  getUserInfo,
  processUserLogin,
  refreshAccessToken,
} from '../services/auth.js';
import { UserService } from '../services/firestore.js';

const router = Router();

// セッション型拡張
declare module 'express-session' {
  interface SessionData {
    userId: string;
    accessToken: string;
  }
}

/**
 * GET /api/auth/login
 * OAuth認証URLにリダイレクト
 */
router.get('/login', (req: Request, res: Response) => {
  const authUrl = generateAuthUrl();
  res.redirect(authUrl);
});

/**
 * GET /api/auth/callback
 * OAuth認証コールバック
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error) {
    console.error('OAuth error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=${error}`);
  }

  if (!code || typeof code !== 'string') {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
  }

  try {
    // コードをトークンに交換
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // ユーザー情報を取得
    const userInfo = await getUserInfo(tokens.access_token);

    // ユーザーをDBに保存/更新
    const { user, organization, isNewUser } = await processUserLogin(
      userInfo,
      tokens.refresh_token || null
    );

    // セッションにユーザー情報を保存
    req.session.userId = user.id;
    req.session.accessToken = tokens.access_token;

    // フロントエンドにリダイレクト
    const redirectUrl = isNewUser
      ? `${process.env.FRONTEND_URL}/welcome`
      : `${process.env.FRONTEND_URL}/dashboard`;

    res.redirect(redirectUrl);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

/**
 * GET /api/auth/me
 * 現在のユーザー情報を取得
 */
router.get('/me', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await UserService.getById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User not found' });
    }

    // refreshTokenは返さない
    const { refreshToken, ...safeUser } = user;

    res.json({ user: safeUser });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * ログアウト
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

/**
 * POST /api/auth/refresh
 * アクセストークンをリフレッシュ
 */
router.post('/refresh', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await UserService.getById(req.session.userId);

    if (!user || !user.refreshToken) {
      return res.status(401).json({ error: 'No refresh token available' });
    }

    const newTokens = await refreshAccessToken(user.refreshToken);

    if (newTokens.access_token) {
      req.session.accessToken = newTokens.access_token;
    }

    res.json({ message: 'Token refreshed' });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

export default router;
