import {
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INCOMING_RECORD_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';
import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import mappingDetails from '../../../support/fragments/settings/dataImport/fieldMappingProfile/mappingDetails';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SelectMappingProfile from '../../../support/fragments/settings/dataImport/modals/selectProfileModal';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const postfix = getRandomPostfix();

    const mappingProfileNames = {
      [FOLIO_RECORD_TYPE.INSTANCE]: `AT_C784419_Instance_${postfix}`,
      [FOLIO_RECORD_TYPE.HOLDINGS]: `AT_C784419_Holdings_${postfix}`,
      [FOLIO_RECORD_TYPE.ITEM]: `AT_C784419_Item_${postfix}`,
      [FOLIO_RECORD_TYPE.ORDER]: `AT_C784419_Order_${postfix}`,
      [FOLIO_RECORD_TYPE.INVOICE]: `AT_C784419_Invoice_${postfix}`,
      [FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC]: `AT_C784419_MarcBib_${postfix}`,
      [FOLIO_RECORD_TYPE.MARCAUTHORITY]: `AT_C784419_MarcAuthority_${postfix}`,
    };

    const actionProfile = {
      name: `AT_C784419_ActionProfile_${postfix}`,
      action: 'CREATE',
      folioRecord: EXISTING_RECORD_NAMES.INSTANCE,
    };

    let location;
    let loanTypeName;
    let materialTypeName;
    let user;

    // MARC types are not present in Edit view for 'CREATE' action
    const nonMarcRecordTypes = [
      FOLIO_RECORD_TYPE.INSTANCE,
      FOLIO_RECORD_TYPE.HOLDINGS,
      FOLIO_RECORD_TYPE.ITEM,
      FOLIO_RECORD_TYPE.ORDER,
      FOLIO_RECORD_TYPE.INVOICE,
    ];

    // Repeats TestRail steps 2-9: verify the "FOLIO record type" dropdown options, then for
    // every record type verify the "Link Profile" picker shows only same-type mapping profiles
    const verifyFolioRecordTypeAndLinkedProfilesFiltering = (
      recordTypes = Object.keys(mappingProfileNames),
    ) => {
      NewActionProfile.verifyFolioRecordTypeOptions(recordTypes);

      recordTypes.forEach((type) => {
        const expectedProfileName = mappingProfileNames[type];
        NewActionProfile.chooseRecordType(type);

        NewActionProfile.clickLinkProfileButton();
        // Wait for a successful response to the modal's initial GET before relying on its list
        cy.wait('@getMappingProfiles').its('response.statusCode').should('eq', 200);
        SelectMappingProfile.waitLoading();

        // The results list is virtualized - only rows scrolled into view exist in the DOM, so
        // presence/absence must be checked via search (asserts "X records found") rather than
        // by looking for a MultiColumnListCell directly in the unfiltered list
        SelectMappingProfile.searchProfile(expectedProfileName);
        cy.wait('@getMappingProfiles').its('response.statusCode').should('eq', 200);

        Object.values(mappingProfileNames)
          .filter((profileName) => profileName !== expectedProfileName)
          .forEach((otherProfileName) => {
            SelectMappingProfile.searchProfileAbsent(otherProfileName);
            cy.wait('@getMappingProfiles').its('response.statusCode').should('eq', 200);
          });
        SelectMappingProfile.close();
      });
    };

    before('Create field mapping profiles for every entity type, action profile, login', () => {
      cy.getAdminToken();

      cy.getLocations({
        limit: 1,
        query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
      }).then((loc) => {
        location = loc;
      });
      cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
        loanTypeName = loanTypes[0].name;
      });
      cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((materialType) => {
        materialTypeName = materialType.name;
      });

      NewFieldMappingProfile.createInstanceMappingProfileViaApi({
        name: mappingProfileNames[FOLIO_RECORD_TYPE.INSTANCE],
      });
      cy.then(() => {
        NewFieldMappingProfile.createHoldingsMappingProfileViaApi({
          name: mappingProfileNames[FOLIO_RECORD_TYPE.HOLDINGS],
          permanentLocation: `${location.name} (${location.code})`,
        });
      });
      cy.then(() => {
        NewFieldMappingProfile.createItemMappingProfileViaApi({
          name: mappingProfileNames[FOLIO_RECORD_TYPE.ITEM],
          materialType: materialTypeName,
          permanentLoanType: loanTypeName,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        });
      });
      FieldMappingProfiles.createMappingProfileViaApi({
        profile: {
          name: mappingProfileNames[FOLIO_RECORD_TYPE.ORDER],
          incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.ORDER,
          description: '',
          mappingDetails: mappingDetails.ORDER,
        },
        addedRelations: [],
        deletedRelations: [],
      });
      FieldMappingProfiles.createMappingProfileViaApi({
        profile: {
          name: mappingProfileNames[FOLIO_RECORD_TYPE.INVOICE],
          incomingRecordType: 'EDIFACT_INVOICE',
          existingRecordType: EXISTING_RECORD_NAMES.INVOICE,
          description: '',
          mappingDetails: mappingDetails.INVOICE,
        },
        addedRelations: [],
        deletedRelations: [],
      });
      NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi({
        name: mappingProfileNames[FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC],
      });
      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi({
        name: mappingProfileNames[FOLIO_RECORD_TYPE.MARCAUTHORITY],
      });

      // Action profile is created WITHOUT a linked mapping profile, so its own "Link Profile"
      // button stays enabled when it's later opened for edit (a linked one gets disabled)
      ActionProfiles.createActionProfileViaApi({
        profile: actionProfile,
        addedRelations: [],
        deletedRelations: [],
      });

      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          user.userId,
          [Capabilities.settingsEnabled],
          [CapabilitySets.uiDataImportSettingsManage],
        );

        cy.login(user.username, user.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: ActionProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      ActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      Object.values(mappingProfileNames).forEach((profileName) => {
        FieldMappingProfiles.deleteMappingProfileByNameViaApi(profileName);
      });
    });

    it(
      'C784419 Verify the FOLIO record type on action profile (promin)',
      { tags: ['criticalPath', 'promin', 'C784419'] },
      () => {
        cy.intercept('GET', '**/data-import-profiles/mappingProfiles**').as('getMappingProfiles');

        // Step 1: Actions > New action profile
        ActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyNewActionProfileExists();

        // TO DO: Remove this section when https://folio-org.atlassian.net/browse/UIDATIMP-1790 is fixed
        NewActionProfile.chooseRecordType(FOLIO_RECORD_TYPE.INSTANCE);
        NewActionProfile.clickLinkProfileButton();
        cy.wait('@getMappingProfiles').its('response.statusCode').should('eq', 200);
        SelectMappingProfile.waitLoading();
        SelectMappingProfile.close();

        // Steps 2-9
        verifyFolioRecordTypeAndLinkedProfilesFiltering();

        // Step 10: close "New action profile" page without saving
        NewActionProfile.closeProfileWithoutSaving();

        // Step 11: find the precondition action profile, Actions > Edit
        ActionProfiles.search(actionProfile.name);
        cy.wait(2000);
        ActionProfiles.selectActionProfileFromList(actionProfile.name);
        ActionProfileView.verifyActionProfileOpened();
        ActionProfileView.edit();

        // Step 12: repeat steps 2-9 on the "Edit action profile" page - MARC Bibliographic and
        // MARC Authority are no longer offered/selectable due to additional restrictions
        NewActionProfile.verifyFolioRecordTypeOptionsDoesNotContainText(
          FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        );
        NewActionProfile.verifyFolioRecordTypeOptionsDoesNotContainText(
          FOLIO_RECORD_TYPE.MARCAUTHORITY,
        );
        verifyFolioRecordTypeAndLinkedProfilesFiltering(nonMarcRecordTypes);
      },
    );
  });
});
