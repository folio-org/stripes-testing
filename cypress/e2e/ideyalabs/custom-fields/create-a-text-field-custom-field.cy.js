import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

it(
  'C15701 Change custom fields order (volaris)',
  { tags: ['ideaLabsTests', 'ideaLabsTests'] },
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
