import settingsMenu from '../../../../support/fragments/settingsMenu';
import TransferFeeFine from '../../../../support/fragments/users/transferFeeFine';

describe('Build the Duke bursar transfer file', () => {
  before(() => {
    cy.loginAsAdmin({
      path: settingsMenu.usersTransferCriteria,
      waiter: TransferFeeFine.waitLoadingTransferCriteria,
    });
  });

  it('should be able to open all the panes', () => {
    TransferFeeFine.openAllPanes();
    TransferFeeFine.verifyOpenAllPanes();
  });

  it('should be able to set scheduling', () => {
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
    TransferFeeFine.addDukeHeaderFormat();
    TransferFeeFine.verifyAddDukeHeaderFormat();
  });

  // Account Data Format
  it('should be able to set account data format', () => {
    TransferFeeFine.clearFormat('data');
    TransferFeeFine.verifyClearFormat('data');
    TransferFeeFine.addDukeDataFormat();
    TransferFeeFine.verifyAddDukeDataFormat();
  });

  // Footer Format
  it('should be able to set footer format', () => {
    TransferFeeFine.clearFormat('footer');
    TransferFeeFine.verifyClearFormat('footer');
  });

  // Transer account data to
  it('should be able to set transfer account data to', () => {
  });

  it('should be able to run manually', () => {
    TransferFeeFine.runManually();
    TransferFeeFine.verifyRunManually();
  });
});
