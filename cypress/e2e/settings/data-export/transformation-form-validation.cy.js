import permissions from '../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ModalSelectTransformations from '../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const fieldMappingProfileName = `AT_C543742_fieldMappingProfile_${getRandomPostfix()}`;
const instanceIdentifierISBN = 'Instance - Identifier - ISBN';
const instanceContributorMeetingName = 'Instance - Contributor - Meeting name - primary';
const newTransformationCalloutMessage = '1 transformation has been successfully added';
const twoTransformationsCalloutMessage = '2 transformations have been successfully added';
const newFieldMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully created`;

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      ExportFieldMappingProfiles.getFieldMappingProfile({
        query: `"name"=="${fieldMappingProfileName}"`,
      }).then((response) => {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C543742 Transformation form validation (firebird)',
      { tags: ['extendedPath', 'firebird', 'C543742'] },
      () => {
        // Step 1: Click "New" button in the top right corner of "Field mapping profiles" pane
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportNewFieldMappingProfile.clickNewButton();
        ExportNewFieldMappingProfile.verifyNewFieldMappingProfileFormIsOpened();

        // Step 2: Fill in the "Name*" field, check "Inventory instance (selected fields)", click "Add transformations" button
        ExportNewFieldMappingProfile.createNewFieldMappingProfile(fieldMappingProfileName, [
          'Inventory instance (selected fields)',
        ]);

        // Step 3: Check "Instance" checkbox and uncheck "Holdings", "Item" checkboxes under "Record type" accordion
        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.uncheckItemRecordTypeChechbox();
        ModalSelectTransformations.verifyTransformationFieldsFilteredByRecordType('Instance');
        ModalSelectTransformations.verifySearchResultDoesNotInclude(['Holdings', 'Item']);

        // Step 4: Check checkbox next to "Instance - Identifier - ISBN" field name
        ModalSelectTransformations.searchItemTransformationsByName(instanceIdentifierISBN);
        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.verifyTotalSelected('1');

        // Step 5: Click "Save & close" button
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        ModalSelectTransformations.verifyFieldHasError('marcField');
        ModalSelectTransformations.verifyFieldHasError('subfield');
        ModalSelectTransformations.verifySaveAndCloseButtonDisabled();

        // Step 6: Click error icon for "Field" field
        ModalSelectTransformations.clickErrorIconForFieldAndVerifyPopover('marcField');

        // Step 7: Click error icon for "Subfield" field
        ModalSelectTransformations.clickErrorIconForFieldAndVerifyPopover('subfield');

        // Step 8: Try to type more than 3 symbols in "Field" field
        ModalSelectTransformations.typeInTransformationsMarcTextField('2455');
        ModalSelectTransformations.verifyValueInField(instanceIdentifierISBN, 'marcField', '245');

        // Step 9: Try to type more than 1 symbol in "Subfield" field
        ModalSelectTransformations.typeInSubfieldTextField('ab');
        ModalSelectTransformations.verifyValueInField(instanceIdentifierISBN, 'subfield', 'a');

        // Step 10: Type 2 digits in "Field" field, type slash in "In.1" and "In.2" fields, type special symbol in "Subfield" field, click "Save & close" button
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          instanceIdentifierISBN,
          '02',
          '/',
          '/',
          '$',
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();

        const fieldsWithErrors = ['marcField', 'indicator1', 'indicator2', 'subfield'];

        fieldsWithErrors.forEach((field) => {
          ModalSelectTransformations.verifyFieldHasError(field);
        });

        ModalSelectTransformations.verifySaveAndCloseButtonDisabled();

        // Steps 11-14: Click error icons for "Field", "In.1", "In.2", and "Subfield" fields
        fieldsWithErrors.forEach((field) => {
          ModalSelectTransformations.clickErrorIconForFieldAndVerifyPopover(field);
        });

        // Step 15: Type valid values and click "Save & close" button
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          instanceIdentifierISBN,
          '020',
          '\\',
          '\\',
          'a',
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          instanceIdentifierISBN,
          '020',
          '\\',
          '\\',
          'a',
        );

        // Step 16: Click "Add transformations" button
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.verifyTransformationsPaneColumns();

        // Step 17: Check checkbox next to "Instance - Contributor - Meeting name - primary" field name, type invalid values, click "Save & close" button
        ModalSelectTransformations.searchItemTransformationsByName(instanceContributorMeetingName);
        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          instanceContributorMeetingName,
          'lll',
          '2',
          ' ',
          'a',
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        ModalSelectTransformations.verifyFieldHasError('marcField');
        ModalSelectTransformations.verifySaveAndCloseButtonDisabled();

        // Step 18: Click error icon for "Field" field
        ModalSelectTransformations.clickErrorIconForFieldAndVerifyPopover('marcField');

        // Step 19: Type 3 digits in "Field" field, click "Save & close" button
        ModalSelectTransformations.typeInTransformationsMarcTextField('111');
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(twoTransformationsCalloutMessage);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          instanceContributorMeetingName,
          '111',
          '2',
          '\\',
          'a',
          0,
        );

        // Step 20: Click "Add transformations" button
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.verifyTransformationsPaneColumns();

        // Step 21: Check "In.2" field for "Instance - Contributor - Meeting name - primary" field name
        ModalSelectTransformations.searchItemTransformationsByName(instanceContributorMeetingName);
        ModalSelectTransformations.verifyTransformationsTextfieldsByFieldName(
          instanceContributorMeetingName,
          '111',
          '2',
          '\\',
          'a',
        );

        // Step 22: Click "Save & close" button on "Select transformations" form and "New field mapping profile" form
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);
        ExportFieldMappingProfiles.searchFieldMappingProfile(fieldMappingProfileName);
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(fieldMappingProfileName);
      },
    );
  });
});
