import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const label2 = `select${randomFourDigitNumber()}`;
const singleSelectData = {
  data: {
    fieldLabel: `Single Select Dropdown${randomFourDigitNumber()}`,
    helpText: 'select One Data',
    label1: `Select${randomFourDigitNumber()}`,
    label2,
  },
};

describe.skip('Settings', () => {
  it(
    'C15697 Create a single select custom field (volaris)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomSingleSelect(singleSelectData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords('testing');
      UsersSearchPane.selectFirstUser('Excel, Testing');
      UsersSearchPane.verifySingleSelect(singleSelectData.data.fieldLabel, label2);
    },
  );

  it(
    'C15701 Change custom fields order (volaris)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.editButton();
      UsersSearchPane.dragAndDropCustomFields();
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords('testing');
      UsersSearchPane.selectFirstUser('Excel, Testing');
      UsersSearchPane.verifyDragItem();
    },
  );
});
