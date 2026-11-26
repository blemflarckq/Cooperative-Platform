import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateSchemeDto } from "./create-scheme.dto";
import { UpdateSchemeDto } from "./update-scheme.dto";

const valid = {
  name: "Savings Club",
  cycleMode: "FIXED_PERIOD",
  contributionMode: "MONTHLY_FIXED",
  loanMode: "SELF_BACKED",
  payoutMode: "END_OF_CYCLE",
};

const errorsFor = async (cls: new () => object, plain: object) =>
  (await validate(plainToInstance(cls, plain), { whitelist: true, forbidNonWhitelisted: true })).map(
    (e) => e.property,
  );

describe("CreateSchemeDto", () => {
  it("accepts a normal scheme", async () => {
    expect(await errorsFor(CreateSchemeDto, valid)).toEqual([]);
  });

  it.each(["", "   ", "\n\t"])("refuses a name that is empty once trimmed (%j)", async (name) => {
    expect(await errorsFor(CreateSchemeDto, { ...valid, name })).toContain("name");
  });

  it("trims the name it keeps", () => {
    expect(plainToInstance(CreateSchemeDto, { ...valid, name: "  Burial Society  " }).name).toBe("Burial Society");
  });

  it("refuses a name over 160 characters and a description over 1000", async () => {
    expect(await errorsFor(CreateSchemeDto, { ...valid, name: "x".repeat(161) })).toContain("name");
    expect(await errorsFor(CreateSchemeDto, { ...valid, description: "x".repeat(1001) })).toContain("description");
  });

  it("refuses a mode that doesn't exist", async () => {
    expect(await errorsFor(CreateSchemeDto, { ...valid, loanMode: "ALWAYS" })).toContain("loanMode");
  });
});

describe("UpdateSchemeDto", () => {
  it("accepts a partial update", async () => {
    expect(await errorsFor(UpdateSchemeDto, { description: "Now with words" })).toEqual([]);
  });

  it("still refuses a blank name when one is sent", async () => {
    expect(await errorsFor(UpdateSchemeDto, { name: "  " })).toContain("name");
  });
});
