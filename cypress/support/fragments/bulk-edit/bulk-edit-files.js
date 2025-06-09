/* eslint-disable no-unused-expressions */
import FileManager from '../../utils/fileManager';
import DateTools from '../../utils/dateTools';

const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

export default {
  getMatchedRecordsFileName(fileName, isDateIncluded = false) {
    if (isDateIncluded) {
      return `${todayDate}-Matched-Records-${fileName}`;
    } else {
      return `*-Matched-Records-${fileName}`;
    }
  },

  getPreviewFileName(fileName, isDateIncluded = false) {
    if (isDateIncluded) {
      return `${todayDate}-Updates-Preview-CSV-${fileName}`;
    } else {
      return `*-Updates-Preview-CSV-${fileName}`;
    }
  },

  getPreviewMarcFileName(fileName, isDateIncluded = false) {
    if (isDateIncluded) {
      return `${todayDate}-Updates-Preview-MARC-${fileName}`.replace('.csv', '.mrc');
    } else {
      return `*-Updates-Preview-MARC-${fileName}`.replace('.csv', '.mrc');
    }
  },

  getChangedRecordsFileName(fileName, isDateIncluded = false) {
    if (isDateIncluded) {
      return `${todayDate}-Changed-Records-CSV-${fileName}`;
    } else {
      return `*-Changed-Records-CSV-${fileName}`;
    }
  },

  getChangedRecordsMarcFileName(fileName, isDateIncluded = false) {
    if (isDateIncluded) {
      return `${todayDate}-Changed-Records-MARC-${fileName}`.replace('.csv', '.mrc');
    } else {
      return `*-Changed-Records-MARC-${fileName}`.replace('.csv', '.mrc');
    }
  },

  getPreviewOfProposedChangesFileName(fileName, isDateIncluded = false) {
    if (isDateIncluded) {
      return `${todayDate}-Updates-Preview-CSV-${fileName}`;
    } else {
      return `*-Updates-Preview-CSV-${fileName}`;
    }
  },

  getErrorsFromCommittingFileName(fileName, isDateIncluded = false) {
    if (isDateIncluded) {
      return `${todayDate}-Committing-changes-Errors-${fileName}`;
    } else {
      return `*-Committing-changes-Errors-${fileName}`;
    }
  },

  getErrorsFromMatchingFileName(fileName, isDateIncluded = false) {
    if (isDateIncluded) {
      return `${todayDate}-Matching-Records-Errors-${fileName}`;
    } else {
      return `*-Matching-Records-Errors-${fileName}`;
    }
  },

  verifyMatchedResultFileContent(
    fileName,
    expectedResult,
    resultType = 'barcode',
    validFile = true,
  ) {
    let verifyFunc;
    switch (resultType) {
      case 'barcode':
        verifyFunc = this.verifyMatchedResultByItemBarcode;
        break;
      case 'holdingsItemBarcode':
        verifyFunc = this.verifyMatchedResultByHoldingsItemBarcode;
        break;
      case 'firstName':
        verifyFunc = this.verifyMatchedResultByFirstName;
        break;
      case 'userId':
        verifyFunc = this.verifyMatchedResultByUserId;
        break;
      case 'userBarcode':
        verifyFunc = this.verifyMatchedResultByUserBarcode;
        break;
      case 'patronGroup':
        verifyFunc = this.verifyMatchedResultPatronGroup;
        break;
      case 'expirationDate':
        verifyFunc = this.verifyMatchedResultExpirationDate;
        break;
      case 'firstElement':
        verifyFunc = this.verifyMatchedResultFirstElement;
        break;
      case 'emailDomain':
        verifyFunc = this.verifyMatchedResultByEmailDomain;
        break;
      case 'permanentLocation':
        verifyFunc = this.verifyMatchedResultByPermanentLocation;
        break;
      case 'temporaryLocation':
        verifyFunc = this.verifyMatchedResultByTemporaryLocation;
        break;
      case 'instanceHrid':
        verifyFunc = this.verifyMatchedResultByInstanceHrid;
        break;
      case 'itemStatus':
        verifyFunc = this.verifyMatchedResultByItemStatus;
        break;
      default:
        verifyFunc = this.verifyMatchedResultByHRID;
    }

    const getValuesFromCSVFile =
      validFile === true ? this.getValuesFromValidCSVFile : this.getValuesFromInvalidCSVFile;
    // expectedResult is list of expected values
    FileManager.findDownloadedFilesByMask(fileName).then((downloadedFilenames) => {
      FileManager.readFile(downloadedFilenames[0]).then((actualContent) => {
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
    FileManager.findDownloadedFilesByMask(fileName).then((downloadedFilenames) => {
      FileManager.readFile(downloadedFilenames[0]).then((actualContent) => {
        const values = this.getValuesFromCSVFile(actualContent);
        // verify each row in csv file
        values.forEach((elem, index) => {
          expect(elem).to.include(expectedResult[index]);
        });
      });
    });
  },

  getValuesFromCSVFile(content) {
    // parse csv
    return content.split('\n');
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

  verifyMatchedResultByHoldingsItemBarcode(actualResult, expectedResult) {
    const actualBarcode = actualResult.split(',')[34];
    expect(actualBarcode).to.eq(expectedResult);
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
    const actualExpirationDate = actualResult.split(',')[21];
    expect(actualExpirationDate).to.include(expectedResult);
  },

  verifyMatchedResultByEmailDomain(actualResult, expectedResult) {
    const actualEmailDomain = actualResult.split(',')[13];
    expect(actualEmailDomain).to.include('@' + expectedResult);
  },

  verifyMatchedResultByPermanentLocation(actualResult, expectedResult) {
    const actualPermanentLocation = actualResult.split(',')[9];
    expect(actualPermanentLocation).to.eq(expectedResult);
  },

  verifyMatchedResultByTemporaryLocation(actualResult, expectedResult) {
    const actualTemporaryLocation = actualResult.split(',')[10];
    expect(actualTemporaryLocation).to.eq(expectedResult);
  },

  verifyMatchedResultByInstanceHrid(actualResult, expectedResult) {
    const actualInstanceHrid = actualResult.split(',')[33];
    expect(actualInstanceHrid).to.eq(expectedResult);
  },

  verifyMatchedResultByItemStatus(actualResult, expectedResult) {
    const actualItemStatus = actualResult.split(',')[33];
    expect(actualItemStatus).to.eq(expectedResult);
  },

  verifyCSVFileRowsValueIncludes(fileName, value) {
    FileManager.findDownloadedFilesByMask(fileName).then((downloadedFilenames) => {
      FileManager.readFile(downloadedFilenames[0]).then((actualContent) => {
        const values = this.getValuesFromValidCSVFile(actualContent);
        // verify each row with values in csv file
        values.forEach((elem, index) => {
          expect(elem).to.include(value[index]);
        });
      });
    });
  },

  verifyCSVFileRecordsNumber(fileName, recordsNumber) {
    FileManager.findDownloadedFilesByMask(fileName).then((downloadedFilenames) => {
      FileManager.readFile(downloadedFilenames[0]).then((actualContent) => {
        const values = this.getValuesFromCSVFile(actualContent.trim());

        expect(values).to.have.length(recordsNumber);
      });
    });
  },

  verifyCSVFileRowsRecordsNumber(fileName, recordsNumber) {
    return FileManager.convertCsvToJson(fileName).then((jsonDataArray) => {
      expect(jsonDataArray).to.be.an('array').and.not.be.empty;
      expect(jsonDataArray).to.have.length(recordsNumber);
    });
  },

  verifyValueInRowByUUID(filePath, uuidHeader, uuidValue, targetHeader, expectedValue) {
    return FileManager.convertCsvToJson(filePath).then((jsonDataArray) => {
      expect(jsonDataArray).to.be.an('array').and.not.be.empty;

      const targetRow = jsonDataArray.find((row) => row[uuidHeader] === uuidValue);

      expect(targetRow).to.exist;

      const actualValue = targetRow[targetHeader];

      expect(actualValue).to.equal(expectedValue);
    });
  },

  verifyHeaderValueInRowByIdentifier(filePath, identifierHeader, identifierValue, targetValues) {
    return FileManager.convertCsvToJson(filePath).then((jsonDataArray) => {
      expect(jsonDataArray).to.be.an('array').and.not.be.empty;

      const targetRow = jsonDataArray.find((row) => row[identifierHeader] === identifierValue);

      expect(targetRow).to.exist;

      targetValues.forEach((pair) => {
        const actualValue = targetRow[pair.header];

        expect(actualValue).to.equal(pair.value);
      });
    });
  },

  verifyColumnHeaderExistsInCsvFile(fileName, columnHeaders) {
    FileManager.findDownloadedFilesByMask(fileName).then((downloadedFilenames) => {
      FileManager.readFile(downloadedFilenames[0]).then((actualContent) => {
        const values = this.getValuesFromCSVFile(actualContent);
        const stringWithHeaders = values.shift();

        columnHeaders.forEach((columnHeader) => {
          expect(stringWithHeaders).to.include(columnHeader);
        });
      });
    });
  },
};
