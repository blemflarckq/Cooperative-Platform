import { SchemeStatus } from "../enums/scheme.enums";
import {
  changedStructureFields,
  checkAcceptsNewActivity,
  checkArchive,
  checkSchemeUpdate,
  checkTransition,
  describeArchiveBlockers,
} from "./scheme-rules";

const current = {
  code: "savings-club",
  cycleMode: "FIXED_PERIOD",
  contributionMode: "MONTHLY_FIXED",
  loanMode: "SELF_BACKED",
  payoutMode: "END_OF_CYCLE",
};

describe("changedStructureFields", () => {
  it("ignores fields that weren't sent", () => {
    expect(changedStructureFields(current, {})).toEqual([]);
  });

  it("ignores fields sent with the value they already have", () => {
    // The edit form sends everything; re-sending what's there is not a change.
    expect(changedStructureFields(current, { ...current })).toEqual([]);
  });

  it("reports only the ones that differ", () => {
    expect(
      changedStructureFields(current, { ...current, loanMode: "DISABLED", payoutMode: "NO_PAYOUT" }),
    ).toEqual(["loanMode", "payoutMode"]);
  });
});

describe("checkSchemeUpdate", () => {
  it("lets a draft change anything", () => {
    expect(
      checkSchemeUpdate({ status: SchemeStatus.DRAFT, changedStructure: ["cycleMode", "code"] }),
    ).toBeNull();
  });

  it.each([SchemeStatus.ACTIVE, SchemeStatus.SUSPENDED])(
    "lets a %s scheme change its name and description (no structure change)",
    (status) => {
      expect(checkSchemeUpdate({ status, changedStructure: [] })).toBeNull();
    },
  );

  it.each([SchemeStatus.ACTIVE, SchemeStatus.SUSPENDED])(
    "refuses a structure change on a %s scheme, naming what was asked for",
    (status) => {
      const v = checkSchemeUpdate({ status, changedStructure: ["loanMode", "payoutMode"] });
      expect(v?.kind).toBe("conflict");
      expect(v?.message).toContain("loan mode and payout mode");
      expect(v?.message).toContain("The name and description can still be changed");
    },
  );

  it("names a single field plainly", () => {
    expect(
      checkSchemeUpdate({ status: SchemeStatus.ACTIVE, changedStructure: ["code"] })?.message,
    ).toMatch(/^The code can't be changed/);
  });

  it("refuses everything on an archived scheme, even a no-op", () => {
    const v = checkSchemeUpdate({ status: SchemeStatus.ARCHIVED, changedStructure: [] });
    expect(v?.kind).toBe("invalid");
    expect(v?.message).toMatch(/Archived schemes cannot be updated/);
  });
});

describe("checkTransition", () => {
  const ok: Array<[SchemeStatus, SchemeStatus]> = [
    [SchemeStatus.DRAFT, SchemeStatus.ACTIVE],
    [SchemeStatus.DRAFT, SchemeStatus.ARCHIVED],
    [SchemeStatus.ACTIVE, SchemeStatus.SUSPENDED],
    [SchemeStatus.ACTIVE, SchemeStatus.ARCHIVED],
    [SchemeStatus.SUSPENDED, SchemeStatus.ACTIVE],
    [SchemeStatus.SUSPENDED, SchemeStatus.ARCHIVED],
  ];
  it.each(ok)("allows %s -> %s", (from, to) => {
    expect(checkTransition(from, to)).toBeNull();
  });

  it("says so when it's already there, instead of quoting enum values", () => {
    expect(checkTransition(SchemeStatus.ACTIVE, SchemeStatus.ACTIVE)?.message).toBe(
      "This scheme is already active.",
    );
    expect(checkTransition(SchemeStatus.SUSPENDED, SchemeStatus.SUSPENDED)?.message).toBe(
      "This scheme is already suspended.",
    );
  });

  it("only an active scheme can be suspended", () => {
    expect(checkTransition(SchemeStatus.DRAFT, SchemeStatus.SUSPENDED)?.message).toBe(
      "Only an active scheme can be suspended.",
    );
  });

  it("archived is final", () => {
    for (const to of [SchemeStatus.ACTIVE, SchemeStatus.SUSPENDED]) {
      expect(checkTransition(SchemeStatus.ARCHIVED, to)?.message).toMatch(/closed for good/);
    }
  });

  it("nothing goes back to draft", () => {
    expect(checkTransition(SchemeStatus.ACTIVE, SchemeStatus.DRAFT)).not.toBeNull();
  });
});

describe("archive blockers", () => {
  it("is allowed when nothing is running and nothing is owed", () => {
    expect(checkArchive("Club", { runningCycles: 0, unpaidLoans: 0 })).toBeNull();
    expect(describeArchiveBlockers({ runningCycles: 0, unpaidLoans: 0 })).toEqual([]);
  });

  it("says what is in the way, with the right singular and plural", () => {
    expect(describeArchiveBlockers({ runningCycles: 1, unpaidLoans: 1 })).toEqual([
      "1 cycle is still running",
      "1 loan isn't fully repaid",
    ]);
    expect(describeArchiveBlockers({ runningCycles: 3, unpaidLoans: 2 })).toEqual([
      "3 cycles are still running",
      "2 loans aren't fully repaid",
    ]);
  });

  it("builds one sentence the page can show as it is", () => {
    const v = checkArchive("Savings Club", { runningCycles: 1, unpaidLoans: 2 });
    expect(v?.kind).toBe("conflict");
    expect(v?.message).toBe(
      `"Savings Club" can't be archived yet: 1 cycle is still running and 2 loans aren't fully repaid. ` +
        `Close the cycles and settle the loans first.`,
    );
  });

  it("works with only one kind of blocker", () => {
    expect(checkArchive("Club", { runningCycles: 0, unpaidLoans: 1 })?.message).toContain(
      "yet: 1 loan isn't fully repaid.",
    );
  });
});

describe("checkAcceptsNewActivity", () => {
  it("only an active scheme takes new activity", () => {
    expect(checkAcceptsNewActivity({ name: "Club", status: SchemeStatus.ACTIVE })).toBeNull();
    for (const status of [SchemeStatus.DRAFT, SchemeStatus.SUSPENDED, SchemeStatus.ARCHIVED]) {
      expect(checkAcceptsNewActivity({ name: "Club", status })?.kind).toBe("invalid");
    }
  });

  it("explains a suspension in terms of what is paused, and how to undo it", () => {
    expect(checkAcceptsNewActivity({ name: "Club", status: SchemeStatus.SUSPENDED })?.message).toBe(
      `"Club" is suspended, so it isn't taking new contributions, loan requests or members right now. Resume it first.`,
    );
  });

  it("says a draft hasn't been activated, and an archive is closed", () => {
    expect(checkAcceptsNewActivity({ name: "Club", status: SchemeStatus.DRAFT })?.message).toMatch(
      /hasn't been activated yet/,
    );
    expect(checkAcceptsNewActivity({ name: "Club", status: SchemeStatus.ARCHIVED })?.message).toMatch(
      /archived/,
    );
  });
});
