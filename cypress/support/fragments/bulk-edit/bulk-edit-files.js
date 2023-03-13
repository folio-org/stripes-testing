import FileManager from '../../utils/fileManager';

export default {
  verifyMatchedResultFileContent(fileName, expectedResult, resultType = 'barcode', validFile = true) {
    const verifyFunc = resultType === 'barcode' ? this.verifyMatchedResultByItemBarcode 
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

  verifyMatchedResultByHRID(actualResult, expectedResult) {
    const actualHRID = actualResult.split(',')[2];
    expect(actualHRID).to.eq(expectedResult);
  },

  verifyMatchedResultFirstElement(actualResult, expectedResult) {
    const actualHRID = actualResult.split(',')[0];
    expect(actualHRID).to.eq(expectedResult);
  },
};
