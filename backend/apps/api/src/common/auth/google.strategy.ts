import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, StrategyOptions, Profile } from "passport-google-oauth20";
import { getOptionalEnv } from "../../config/env";

export interface OAuthProfileResult {
  email: string;
  firstName: string;
  lastName: string;
  provider: "google" | "facebook";
}

/**
 * Deliberately minimal scope — openid, email, profile. Enough to
 * confirm identity; nothing about Drive, Calendar, or anything beyond
 * "who is this person." These are Google's "non-sensitive" scopes,
 * which is why this works immediately in Testing mode with no app
 * review needed.
 *
 * Uses getOptionalEnv, not getRequiredEnv — the app must still boot
 * cleanly for anyone who hasn't configured Google OAuth yet. Hitting
 * /auth/google without real credentials will fail at that point, not
 * at server startup.
 */
@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    const options: StrategyOptions = {
      // passport-oauth2 throws at CONSTRUCTION time if clientID/secret
      // are empty — an empty-string fallback doesn't achieve "boots
      // fine without OAuth configured," it still crashes the whole app.
      // A non-empty placeholder lets the strategy construct; actually
      // hitting /auth/google unconfigured then fails at Google's end
      // with a clear invalid-client error, not a server crash.
      clientID: getOptionalEnv("GOOGLE_CLIENT_ID", "not-configured"),
      clientSecret: getOptionalEnv("GOOGLE_CLIENT_SECRET", "not-configured"),
      callbackURL: getOptionalEnv(
        "GOOGLE_CALLBACK_URL",
        "http://localhost:3000/auth/google/callback",
      ),
      scope: ["openid", "email", "profile"],
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super(options);
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): OAuthProfileResult {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new Error("Google did not return an email address for this account.");
    }

    return {
      email,
      firstName: profile.name?.givenName ?? profile.displayName ?? "Member",
      lastName: profile.name?.familyName ?? "",
      provider: "google",
    };
  }
}
