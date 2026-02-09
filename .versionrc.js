module.exports = {
  types: [
    { type: 'feat', section: 'Added' },
    { type: 'fix', section: 'Fixed' },
    { type: 'perf', section: 'Changed' },
    { type: 'refactor', section: 'Changed' },
    { type: 'revert', section: 'Removed' },
    { type: 'docs', section: 'Documentation', hidden: true },
    { type: 'style', section: 'Styles', hidden: true },
    { type: 'chore', section: 'Miscellaneous', hidden: true },
    { type: 'ci', section: 'CI/CD', hidden: true },
    { type: 'build', section: 'Build', hidden: true },
    { type: 'test', section: 'Tests', hidden: true }
  ],
  releaseCommitMessageFormat: 'chore(release): {{currentTag}}'
};
