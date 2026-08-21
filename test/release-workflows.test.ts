import fs from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("Intern SDK release automation", () => {
  test("a manual semantic version bump reaches the tag-bound OIDC publisher", async () => {
    // The release entrypoint records the operator's version decision before
    // tagging the exact commit produced by the required rebase merge.
    const release = await fs.readFile(".github/workflows/release.yml", "utf8");
    expect(release).toMatch(/bump:\n[\s\S]*type: choice/);
    expect(release).toMatch(/- patch\n\s+- minor\n\s+- major/);
    expect(release).toContain('npm version "$BUMP" --no-git-tag-version');
    expect(release).toContain("title=release: @archastro/intern-sdk v$version");
    expect(release).toContain('tag="v${version}"');
    expect(release).toContain('gh pr merge "$pr_url" --rebase --delete-branch');
    expect(release).not.toContain('gh pr merge "$pr_url" --squash');
    expect(release).toContain(
      "gh pr view \"$pr_url\" --json mergeCommit --jq '.mergeCommit.oid'",
    );
    expect(release).toContain('git tag -a "$TAG" "$MERGED_SHA"');
    expect(release).not.toContain('git tag -a "$TAG" origin/main');
    expect(release).toContain('gh workflow run publish.yml --ref "$TAG"');

    const mergeIndex = release.indexOf('gh pr merge "$pr_url"');
    const tagIndex = release.indexOf('git tag -a "$TAG" "$MERGED_SHA"');
    const publishIndex = release.indexOf(
      'gh workflow run publish.yml --ref "$TAG"',
    );
    expect(mergeIndex).toBeGreaterThan(-1);
    expect(tagIndex).toBeGreaterThan(mergeIndex);
    expect(publishIndex).toBeGreaterThan(tagIndex);

    // Publishing is tag-bound, approval-gated, and OIDC-only. This public
    // repository receives npm's automatic provenance attestation.
    const publish = await fs.readFile(".github/workflows/publish.yml", "utf8");
    expect(publish).toMatch(/tags:\n\s+- ["']v\*["']/);
    expect(publish).toContain("if: startsWith(github.ref, 'refs/tags/v')");
    expect(publish).toContain("environment: npm-release");
    expect(publish).toContain("id-token: write");
    expect(publish).toContain('version="${TAG#v}"');
    expect(publish).toContain("npm publish --access public");
    expect(publish).not.toContain("--provenance");
    expect(publish).toContain('gh release create "$TAG"');
    expect(publish).toContain("@archastro/intern-sdk@${version}");
    expect(publish).not.toContain("secrets.NPM_TOKEN");
  });
});
