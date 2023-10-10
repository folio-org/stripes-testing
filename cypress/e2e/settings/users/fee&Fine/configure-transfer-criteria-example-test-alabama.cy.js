import settingsMenu from '../../../../support/fragments/settingsMenu';
import TransferFeeFine from '../../../../support/fragments/users/transferFeeFine';

describe('Build the Duke bursar transfer file', () => {
  let testData;
  before('Preconditions', () => {
    testData = TransferFeeFine.setUpTransferCriteriaTestData('bama');

    cy.loginAsAdmin({
      path: settingsMenu.usersTransferCriteria,
      waiter: TransferFeeFine.waitLoadingTransferCriteria,
    });
  });

  after('Delete created entities', () => {
    TransferFeeFine.cleanUpCreatedEntities(testData);
  });

  it('should be able to open all the panes', () => {
    TransferFeeFine.openAllPanes();
    TransferFeeFine.verifyOpenAllPanes();
  });

  it('should be able to set scheduling', () => {
    TransferFeeFine.setTransferCriteriaScheduling(
      'Weeks',
      '0',
      '12:00 A',
      ['Monday', 'Thursday']
    );
    TransferFeeFine.verifyTransferCriteriaScheduling(
      'WEEK',
      '0',
      '12:00 AM',
      ['Monday', 'Thursday']
    );
  });

  it('should be able to set no criteria', () => {
    TransferFeeFine.setCriteria(false);
    TransferFeeFine.verifyCriteria(false);
  });

  // Aggregate by patron: Box unchecked
  it('should be able to set aggregate by patron', () => {
    TransferFeeFine.setAggregateByPatron(false);
    TransferFeeFine.verifyAggregateByPatron(false);
  });

  // Header Format
  it('should be able to set header format', () => {
    TransferFeeFine.clearFormat('header');
    TransferFeeFine.verifyClearFormat('header');
    TransferFeeFine.addAlabamaHeaderFormat();
    TransferFeeFine.verifyAddAlabamaHeaderFormat();
  });

  // Account Data Format
  it('should be able to set account data format', () => {
    TransferFeeFine.clearFormat('data');
    TransferFeeFine.verifyClearFormat('data');
    TransferFeeFine.addAlabamaDataFormat();
    TransferFeeFine.verifyAddAlabamaDataFormat();
  });

  // Footer Format
  it('should be able to set footer format', () => {
    TransferFeeFine.clearFormat('footer');
    TransferFeeFine.verifyClearFormat('footer');
  });

  // Transfer account data to
  it('should be able to set transfer account data to', () => {
    TransferFeeFine.setTransferAccount(testData.feeFineOwnerTwo.owner, testData.transferAccount.accountName);
    TransferFeeFine.verifyTransferAccount(testData.feeFineOwnerTwo.id, testData.transferAccount.id);
  });

  it('should be able to run manually', () => {
    TransferFeeFine.runManually();
    TransferFeeFine.verifyRunManually();

    // check file content
    TransferFeeFine.checkFileContent(testData.fileContent);
  });
});
