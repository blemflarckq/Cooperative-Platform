import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AccessTokenPayload, AuthenticatedUser } from "./jwt.types";
import { getRequiredEnv } from "../../config/env";

/**
 * JWT strategy validates access tokens.
 *
 * Because we already expanded roles/permissions at login time,
 * we can keep validate() lightweight and simply return the payload.
 *
 * (Optional hardening later: check user active + tenant membership each request)
 */
@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Fails fast at startup if JWT_ACCESS_SECRET isn't set — never
      // silently falls back to a known, insecure default.
      secretOrKey: getRequiredEnv("JWT_ACCESS_SECRET"),
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    // This object becomes req.user
    return payload;
  }
}