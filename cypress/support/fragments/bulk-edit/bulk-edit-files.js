import FileManager from '../../utils/fileManager';

export default {
  verifyMatchedResultFileContent(fileName, expectedResult, resultType = 'barcode', validFile = true) {
    const verifyFunc = resultType === 'barcode' ? this.verifyMatchedResultByItemBarcode
      : resultType === 'firstName' ? this.verifyMatchedResultByFirstName
        : resultType === 'userId' ? this.verifyMatchedResultByUserId
          : resultType === 'userBarcode' ? this.verifyMatchedResultByUserBarcode
            : resultType === 'patronGroup' ? this.verifyMatchedResultPatronGroup
              : resultType === 'expirationDate' ? this.verifyMatchedResultExpirationDate
                : resultType === 'firstElement' ? this.verifyMatchedResultFirstElement
                  : this.verifyMatchedResultByHRID;

    const getValuesFromCSVFile = validFile === true ? this.getValuesFromValidCSVFile
      : this.getValuesFromInvalidCSVFile;
    // expectedResult is list of expected values
    FileManager.findDownloadedFilesByMask(fileName)
      .then((downloadedFilenames) => {
        FileManager.readFile(downloadedFilenames[0])
          .then((actualContent) => {
            const values = getValuesFromCSVFile(actualContent);
            // verify each row in csv file
            values.forEach((elem, index) => {
              verifyFunc(elem, expectedResult[index]);
            });
          });
      });
  },

  verifyCSVFileRows(fileName, expectedResult) {
    // expectedResult is list of expected values
    FileManager.findDownloadedFilesByMask(fileName)
      .then((downloadedFilenames) => {
        FileManager.readFile(downloadedFilenames[0])
          .then((actualContent) => {
            const values = this.getValuesFromCSVFile(actualContent);
            // verify each row in csv file
            values.forEach((elem, index) => {
              expect(elem).to.eq(expectedResult[index]);
            });
          });
      });
  },

  getValuesFromCSVFile(content) {
    // parse csv
    const valuesList = content.split('\n');
    return valuesList;
  },

  getValuesFromValidCSVFile(content) {
    // parse csv and delete first headers row and last whitespace
    const valuesList = content.split('\n');
    valuesList.shift();
    valuesList.pop();
    return valuesList;
  },

  getValuesFromInvalidCSVFile(content) {
    const valuesList = content.split(',');
    valuesList.pop();
    return valuesList;
  },

  verifyMatchedResultByItemBarcode(actualResult, expectedBarcode) {
    const actualBarcode = actualResult.split(',')[9];
    expect(actualBarcode).to.eq(expectedBarcode);
  },

  verifyMatchedResultByUserBarcode(actualResult, expectedBarcode) {
    const actualBarcode = actualResult.split(',')[3];
    expect(actualBarcode).to.eq(expectedBarcode);
  },

  verifyMatchedResultByHRID(actualResult, expectedResult) {
    const actualHRID = actualResult.split(',')[2];
    expect(actualHRID).to.eq(expectedResult);
  },

  verifyMatchedResultByFirstName(actualResult, expectedResult) {
    const actualFirstName = actualResult.split(',')[10];
    expect(actualFirstName).to.eq(expectedResult);
  },

  verifyMatchedResultByUserId(actualResult, expectedResult) {
    const actualUserId = actualResult.split(',')[1];
    expect(actualUserId).to.eq(expectedResult);
  },

  verifyChangedResultByUserId(actualResult, expectedResult) {
    expect(actualResult).to.eq(expectedResult);
  },

  verifyMatchedResultFirstElement(actualResult, expectedResult) {
    const actualFirstElement = actualResult.split(',')[0];
    expect(actualFirstElement).to.eq(expectedResult);
  },

  verifyMatchedResultPatronGroup(actualResult, expectedResult) {
    const actualPatronGroup = actualResult.split(',')[6];
    expect(actualPatronGroup).to.eq(expectedResult);
  },

  verifyMatchedResultExpirationDate(actualResult, expectedResult) {
    const actualExpirationDate = actualResult.split(',')[20];
    expect(actualExpirationDate).to.include(expectedResult);
  },
};
