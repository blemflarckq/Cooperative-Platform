import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AccessTokenPayload, AuthenticatedUser } from "./jwt.types";

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
       // In production, fail fast if secrets are missing.
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? "dev-insecure-secret",
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    // This object becomes req.user
    return payload;
  }
}