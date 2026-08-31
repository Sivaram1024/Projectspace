/**
 * Microsoft Entra External ID Authentication Architecture & Configuration
 */

export interface EntraUser {
  /** Unique Microsoft Entra Object ID (oid / sub) */
  objectId?: string;
  /** User principal name or primary email */
  userPrincipalName?: string;
  /** User display name */
  displayName?: string;
  /** Primary email address */
  email?: string;
  /** Assigned application roles (e.g., ['Student'], ['Admin']) */
  roles?: string[];
  /** Entra tenant ID */
  tenantId?: string;
  /** System ID if available */
  id?: string;
}

export interface EntraAuthConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Helper to check if Microsoft Entra External ID configuration environment variables are present.
 */
export const isEntraConfigured = (): boolean => {
  const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
  const authority = import.meta.env.VITE_ENTRA_AUTHORITY;
  return Boolean(clientId && authority);
};

/**
 * Returns Microsoft Entra configuration settings from environment or defaults.
 */
export const getEntraConfig = (): EntraAuthConfig => {
  return {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID || '',
    authority: import.meta.env.VITE_ENTRA_AUTHORITY || '',
    redirectUri: import.meta.env.VITE_ENTRA_REDIRECT_URI || window.location.origin,
    scopes: ['openid', 'profile', 'email'],
  };
};
