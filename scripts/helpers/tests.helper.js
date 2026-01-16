function removeRootPath(path) {
  return path.substring(path.indexOf('cypress\\e2e\\'));
}
function titleContainsId(title, testCaseIds) {
  if (title === undefined) {
    return false;
  }
  for (let i = 0; i < testCaseIds.length; i++) {
    if (title.includes(testCaseIds[i])) {
      return true;
    }
  }
  return false;
}

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

module.exports = {
  removeRootPath,
  titleContainsId,
  pluralize,
};
