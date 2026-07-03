import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReplaceRolesDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}