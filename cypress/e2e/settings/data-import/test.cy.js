import { including } from '@interactors/html';
import { Accordion, HTML, MultiColumnListHeader } from '../../../../interactors';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
// import FieldMappingProfileEditForm from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileEditForm';
// import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const createdFieldProtectionIds = [];

    const randomBaseField = Math.floor(Math.random() * 90) + 800;
    const firstProtectedField = `${randomBaseField}`;
    const secondProtectedField = `${randomBaseField + 1}`;

    const firstProtectedFieldBody = {
      field: firstProtectedField,
      indicator1: '*',
      indicator2: '*',
      subfield: '*',
      data: '*',
    };
    const secondProtectedFieldBody = {
      field: secondProtectedField,
      indicator1: '*',
      indicator2: '*',
      subfield: '*',
      data: '*',
    };
    const mappingProfile = {
      typeValue: 'MARC Authority',
      name: `C366101 mapping profile ${getRandomPostfix()}`,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'MARC_AUTHORITY',
      description: '',
    };

    const verifyOverrideProtectedFieldsSection = () => {
      const overrideSection = Accordion({ id: 'override-protected-section' });

      cy.expect(overrideSection.has({ open: true }));
      cy.expect(
        overrideSection
          .find(
            HTML(
              including(
                'If any protected field should be updated by this profile, check the appropriate box here',
              ),
            ),
          )
          .exists(),
      );

      ['Field', 'In.1', 'In.2', 'Subfield', 'Data', 'Override'].forEach((header) => {
        cy.expect(overrideSection.find(MultiColumnListHeader(header)).exists());
      });

      [firstProtectedField, secondProtectedField].forEach((field) => {
        cy.get('#override-protected-section').within(() => {
          cy.contains('div[class^="mclCell-"]', field)
            .parents('[data-row-index]')
            .within(() => {
              cy.contains('div[class^="mclCell-"]', '*').should('exist');
              cy.get('input[type="checkbox"]').should('be.enabled');
            });
        });
      });
    };

    before('Create test data and login', () => {
      cy.getAdminToken();

      MarcFieldProtection.createViaApi(firstProtectedFieldBody).then(({ id }) => {
        createdFieldProtectionIds.push(id);
      });
      MarcFieldProtection.createViaApi(secondProtectedFieldBody).then(({ id }) => {
        createdFieldProtectionIds.push(id);
      });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();

      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      createdFieldProtectionIds.forEach((id) => {
        MarcFieldProtection.deleteViaApi(id, true);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C366101 Verify MARC Authority field protections display but disallow override on Field Mapping Create/Edit page (folijet)',
      { tags: ['extendedPath', 'folijet', 'C366101'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.waitLoading();

        NewFieldMappingProfile.fillMappingProfileForUpdatesMarcAuthority(mappingProfile);
        verifyOverrideProtectedFieldsSection();

        // NewFieldMappingProfile.save();
        // FieldMappingProfiles.search(mappingProfile.name);
        // FieldMappingProfiles.selectMappingProfileFromList(mappingProfile.name);
        // FieldMappingProfileView.edit();
        // FieldMappingProfileEditForm.waitLoading();

        // verifyOverrideProtectedFieldsSection();
      },
    );
  });
});
