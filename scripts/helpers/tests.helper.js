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

module.exports = {
  removeRootPath,
  titleContainsId,
};
