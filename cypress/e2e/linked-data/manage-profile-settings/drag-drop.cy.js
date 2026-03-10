import TopMenu from '../../../support/fragments/topMenu';
import LinkedDataEditor from '../../../support/fragments/linked-data/linkedDataEditor';
import { LDE_ROLES } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import ManageProfileSettings from '../../../support/fragments/linked-data/manageProfileSettings';
import { id } from 'date-fns/locale';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];
const profileUris = [
  'http://bibfra.me/vocab/lite/Hub',
  'http://bibfra.me/vocab/lite/Instance',
  'http://bibfra.me/vocab/lite/Work',
];

// Assumes a viewport resolution greater than 720; less than 720,
// responsiveness adds a new screen to move between profiles list
// and settings editor.

describe('Manage profile settings', () => {
  before('Create test data', () => {
    const roleIds = [];
    cy.getAdminToken();

    roleNames.forEach((roleName) => {
      cy.getUserRoleIdByNameApi(roleName).then((roleId) => {
        if (roleId) {
          roleIds.push(roleId);
        }
      });
    });

    cy.createTempUser([
      Permissions.linkedDataDeletePreferredProfile.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });

    cy.then(() => {
      if (roleIds.length > 0) {
        cy.updateRolesForUserApi(user.userId, roleIds);
      }
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();

    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.linkedDataEditor,
      waiter: LinkedDataEditor.waitLoading,
      authRefresh: true,
    });
  });

  afterEach(() => {
    // Clear preferred profiles and reset profile settings to basic inactive state
    profileUris.forEach((uri) => {
      cy.getPreferredProfileForUser(uri).then((profiles) => {
        if (profiles.length > 0) {
          cy.deletePreferredProfileForUser(uri);
        }
      });
      cy.getProfileMetadataByResourceType(uri).then((profiles) => {
        profiles.forEach((profile) => {
          cy.setProfileSettingsForUser(profile.id, {
            active: false,
            children: [],
          });
        });
      })
    });
  });

  it.skip('settings are applied to linked data editor')

  it.skip('changes to settings persist');

  it.only(
    'required components cannot be moved to unused list',
    { tags: ['citation'] },
    () => {
      LinkedDataEditor.openManageProfileSettings();
      ManageProfileSettings.waitMainLoading();
      ManageProfileSettings.waitProfilesLoading();

      ManageProfileSettings.selectProfile('Serials');

      ManageProfileSettings.keyboardDragSelectedToUnused('Profile:Instance:TitleInformation');
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Instance:TitleInformation', 1);

      ManageProfileSettings.dragSelectedToUnusedContainer('Profile:Instance:TitleInformation');
      // Cypress may end up reordering, but the overall point is that it didn't move to unused.
      ManageProfileSettings.verifySelectedComponent('Profile:Instance:TitleInformation');

      ManageProfileSettings.moveComponentUnavailable('Profile:Instance:TitleInformation');
      ManageProfileSettings.verifySelectedComponent('Profile:Instance:TitleInformation');
    },
  );

  it(
    'keyboard reordering and moving between lists',
    { tags: ['citation'] },
    () => {
      LinkedDataEditor.openManageProfileSettings();
      ManageProfileSettings.waitMainLoading();
      ManageProfileSettings.waitProfilesLoading();

      ManageProfileSettings.selectProfile('Books');
      ManageProfileSettings.waitEditorLoading();

      ManageProfileSettings.keyboardDragSelectedComponentAndCancel(3);
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Work:Hubs', 3);

      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Work:DateOfWork');
      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Work:LanguageCode');
      ManageProfileSettings.keyboardDragUnusedComponentAndCancel(2);
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Work:LanguageCode', 2);

      ManageProfileSettings.selectDefaultSettings();
      ManageProfileSettings.keyboardDragReorderSelectedComponent('Profile:Work:ContentType', 'Profile:Work:SupplementaryContent');
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Work:ContentType', 6);
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Work:SupplementaryContent', 7);

      ManageProfileSettings.selectDefaultSettings();
      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Work:DateOfWork');
      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Work:LanguageCode');
      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Work:ContentType');
      ManageProfileSettings.keyboardDragReorderUnusedComponent('Profile:Work:ContentType', 'Profile:Work:DateOfWork');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Work:ContentType', 1);
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Work:LanguageCode', 3);

      ManageProfileSettings.keyboardDragSelectedToUnused('Profile:Work:Hubs');
      ManageProfileSettings.verifyUnusedComponent('Profile:Work:Hubs');

      ManageProfileSettings.keyboardDragUnusedToSelected('Profile:Work:DateOfWork');
      ManageProfileSettings.verifySelectedComponent('Profile:Work:DateOfWork');
    }
  );

  it(
    'mouse reordering and dragging between lists',
    { tags: ['citation'] },
    () => {
      LinkedDataEditor.openManageProfileSettings();
      ManageProfileSettings.waitMainLoading();
      ManageProfileSettings.waitProfilesLoading();

      ManageProfileSettings.selectProfile('Hubs');
      ManageProfileSettings.waitEditorLoading();
      ManageProfileSettings.dragReorderSelectedComponent('Profile:Hub:CreatorOfHub', 'Profile:Hub:LanguageCode');
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Hub:CreatorOfHub', 3);

      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Hub:CreatorOfHub');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:CreatorOfHub', 1);
      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Hub:LanguageCode');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:LanguageCode', 2);
      ManageProfileSettings.dragReorderUnusedComponent('Profile:Hub:CreatorOfHub', 'Profile:Hub:LanguageCode');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:CreatorOfHub', 2);
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:LanguageCode', 1);

      ManageProfileSettings.dragUnusedToSelected('Profile:Hub:LanguageCode', 'Profile:Hub:TitleInformation')
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:CreatorOfHub', 1);
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Hub:LanguageCode', 1);

      ManageProfileSettings.dragSelectedToUnused('Profile:Hub:LanguageCode', 'Profile:Hub:CreatorOfHub')
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:LanguageCode', 1);
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Hub:TitleInformation', 1);

      ManageProfileSettings.selectDefaultSettings();
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Hub:TitleInformation', 2);
      ManageProfileSettings.dragSelectedToUnusedContainer('Profile:Hub:LanguageCode');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:LanguageCode', 1);
      ManageProfileSettings.dragSelectedToUnusedContainer('Profile:Hub:CreatorOfHub');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:CreatorOfHub', 1);

      ManageProfileSettings.dragUnusedToUndroppableRegion('Profile:Hub:CreatorOfHub');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:CreatorOfHub', 1);

      ManageProfileSettings.selectDefaultSettings();
      ManageProfileSettings.dragSelectedToUndroppableRegion('Profile:Hub:CreatorOfHub');
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Hub:CreatorOfHub', 1);
    });

  it(
    'move component to other list by button press',
    { tags: ['citation'] },
    () => {
      LinkedDataEditor.openManageProfileSettings();
      ManageProfileSettings.waitMainLoading();
      ManageProfileSettings.waitProfilesLoading();

      ManageProfileSettings.selectProfile('Hubs');
      ManageProfileSettings.dragSelectedComponentAndCancel(1);
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Hub:CreatorOfHub', 1);
      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Hub:CreatorOfHub');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:CreatorOfHub', 1);
      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Hub:CreatorOfHub');
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Hub:CreatorOfHub', 3);

      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Hub:CreatorOfHub');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:CreatorOfHub', 1);
      ManageProfileSettings.moveComponentToOppositeListButton('Profile:Hub:LanguageCode');
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:LanguageCode', 2);
      ManageProfileSettings.dragUnusedComponentAndCancel(1);
      ManageProfileSettings.verifyUnusedComponentPosition('Profile:Hub:CreatorOfHub', 1);

      ManageProfileSettings.saveAndKeepEditing();
      ManageProfileSettings.verifyModalUnusedOpen();
      ManageProfileSettings.modalUnusedClose();
      ManageProfileSettings.saveAndKeepEditing();
      ManageProfileSettings.verifyModalUnusedOpen();
      ManageProfileSettings.modalUnusedCancel();
      ManageProfileSettings.saveAndKeepEditing();
      ManageProfileSettings.verifyModalUnusedOpen();
      ManageProfileSettings.modalUnusedSave();
  });

  it(
    'nudge buttons in selected component list',
    { tags: ['citation'] },
    () => {
      LinkedDataEditor.openManageProfileSettings();
      ManageProfileSettings.waitMainLoading();
      ManageProfileSettings.waitProfilesLoading();

      ManageProfileSettings.selectProfile('Rare Books');
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Instance:StatementOfResponsibility', 2);
      ManageProfileSettings.nudgeComponentUpButton('Profile:Instance:StatementOfResponsibility');
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Instance:StatementOfResponsibility', 1);
      ManageProfileSettings.nudgeComponentDownButton('Profile:Instance:StatementOfResponsibility');
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Instance:StatementOfResponsibility', 2);
      ManageProfileSettings.nudgeComponentDownButton('Profile:Instance:StatementOfResponsibility');
      ManageProfileSettings.verifySelectedComponentPosition('Profile:Instance:StatementOfResponsibility', 3);
  });

  it(
    'verifies preferred profile setting persists across profile selection changes',
    { tags: ['citation'] },
    () => {
      LinkedDataEditor.openManageProfileSettings();
      ManageProfileSettings.waitMainLoading();
      ManageProfileSettings.waitProfilesLoading();

      ManageProfileSettings.selectProfile('Rare Books');
      ManageProfileSettings.waitEditorLoading();

      ManageProfileSettings.verifyPreferredProfile(false);
      ManageProfileSettings.togglePreferredProfile();
      ManageProfileSettings.verifyPreferredProfile(true);
      
      ManageProfileSettings.selectProfile('Hubs');
      ManageProfileSettings.verifyModalUnsavedOpen();
      ManageProfileSettings.modalUnsavedContinueWithSaving();

      ManageProfileSettings.selectProfile('Rare Books');
      ManageProfileSettings.waitEditorLoading();
      ManageProfileSettings.verifyPreferredProfile(true);
      ManageProfileSettings.togglePreferredProfile();
      ManageProfileSettings.verifyPreferredProfile(false);
    });
});