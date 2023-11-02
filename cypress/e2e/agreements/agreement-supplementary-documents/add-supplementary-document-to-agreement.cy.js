import { Page } from '@interactors/html';
import Agreements from '../../../support/fragments/agreements/agreements';
import TopMenu from '../../../support/fragments/topMenu';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import EditAgreement from '../../../support/fragments/agreements/editAgreement';
import { TestTypes, DevTeams, Permissions } from '../../../support/dictionary';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import Users from '../../../support/fragments/users/users';

const testData = {
  user: {},
};
let agreementId;
const supplementaryDocument = {
  name: `Supplementary Document ${randomFourDigitNumber()}`,
  category: 'License',
  note: `Test Note ${randomFourDigitNumber()}`,
  location: 'Washington',
  url: 'https://folio.org',
};
const fileName = `File ${randomFourDigitNumber()}`;
const folioTitle = 'FOLIO';

describe('Agreement Supplementary documents', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    FileManager.createFile(`cypress/fixtures/${fileName}`, 'someContent');
    Agreements.createViaApi().then((agr) => {
      agreementId = agr.id;
    });
    cy.createTempUser([
      Permissions.uiAgreementsAgreementsEdit.gui,
      Permissions.uiAgreementsFileDownload.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.agreementsPath,
        waiter: Agreements.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Agreements.deleteViaApi(agreementId);
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    FileManager.deleteFileFromDownloadsByMask(`*${fileName}.*`);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1318 Add supplementary document to an agreement (erm) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.erm] },
    () => {
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);

      AgreementViewDetails.gotoEdit();

      EditAgreement.clickAddSupplementaryDocuments();
      EditAgreement.fillSupplementaryDocumentsFields(supplementaryDocument);

      ExportFile.uploadFile(fileName);
      EditAgreement.verifyFileIsUploadedToSupplementaryDocument(fileName);

      EditAgreement.saveAndClose();
      AgreementViewDetails.verifySupplementaryDocumentsCount('1');

      AgreementViewDetails.openSupplementaryDocumentsSection();
      AgreementViewDetails.verifySupplementaryDocumentsRow(supplementaryDocument);

      AgreementViewDetails.openLinkFromSupplementaryDocument(supplementaryDocument.name);
      cy.expect(Page.has({ title: folioTitle }));
      cy.go('back');

      AgreementViewDetails.waitLoading();
      AgreementViewDetails.openSupplementaryDocumentsSection();
      AgreementViewDetails.downloadFileFromSupplementaryDocument(supplementaryDocument.name);
      // Need to wait,while file to be downloaded
      cy.wait(1000);
      FileManager.findDownloadedFilesByMask(`*${fileName}.*`).then((files) => expect(files.length).eq(1));
    },
  );
});
