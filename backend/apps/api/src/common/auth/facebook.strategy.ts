import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, StrategyOptions, Profile } from "passport-facebook";
import { getOptionalEnv } from "../../config/env";
import type { OAuthProfileResult } from "./google.strategy";

/**
 * Same minimal-scope philosophy as Google — email and public_profile
 * only, Facebook's non-sensitive identity scopes. Works in Development
 * mode with no App Review needed, for the test users configured on the
 * app.
 */
@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class FacebookStrategy extends PassportStrategy(Strategy, "facebook") {
  constructor() {
    const options: StrategyOptions = {
      clientID: getOptionalEnv("FACEBOOK_APP_ID", "not-configured"),
      clientSecret: getOptionalEnv("FACEBOOK_APP_SECRET", "not-configured"),
      callbackURL: getOptionalEnv(
        "FACEBOOK_CALLBACK_URL",
        "http://localhost:3000/auth/facebook/callback",
      ),
      profileFields: ["id", "emails", "name"],
      scope: ["email", "public_profile"],
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
      throw new Error(
        "Facebook did not return an email address for this account — the person may need to add one to their Facebook account first.",
      );
    }

    return {
      email,
      firstName: profile.name?.givenName ?? profile.displayName ?? "Member",
      lastName: profile.name?.familyName ?? "",
      provider: "facebook",
    };
  }
}
