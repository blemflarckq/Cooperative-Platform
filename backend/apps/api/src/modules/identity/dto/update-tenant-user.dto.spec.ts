import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateTenantUserDto } from './update-tenant-user.dto';

// The same options the API boots with (main.ts).
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const run = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: UpdateTenantUserDto });

describe('UpdateTenantUserDto', () => {
  it('accepts a name change', async () => {
    await expect(run({ firstName: 'Lerato', lastName: 'Mokoena' })).resolves.toMatchObject({
      firstName: 'Lerato',
    });
  });

  // These two used to be accepted here, which made this endpoint a way to
  // deactivate someone without any of deactivation's safeguards.
  it.each(['isActive', 'mobile', 'email', 'status'])(
    'refuses %s — it has its own route, or is not editable here',
    async (field) => {
      await expect(run({ firstName: 'Lerato', [field]: 'x' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
});
