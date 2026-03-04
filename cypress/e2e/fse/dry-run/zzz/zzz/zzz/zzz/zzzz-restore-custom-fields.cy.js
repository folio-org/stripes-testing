import CustomFields from '../../../../../../../support/fragments/settings/users/customFields';

describe('Restore user custom fields from the back-up', () => {
  const BACKUP_FILE_PATH = 'cypress/fixtures/backup/custom-fields-backup.json';
  let usersModuleId;

  before('Get admin token and module id', () => {
    cy.getAdminToken();
    cy.getApplicationsForTenantApi(Cypress.env('OKAPI_TENANT'), false).then(({ body }) => {
      const moduleIds = [];
      body.applicationDescriptors.forEach((app) => {
        moduleIds.push(...app.modules.map((module) => module.id));
        moduleIds.push(...app.uiModules.map((module) => module.id));
      });
      usersModuleId = moduleIds.find((id) => /^mod-users-\d/.test(id));
    });
  });

  it('Restore custom fields', { tags: ['dryRun'] }, () => {
    cy.log('Checking for custom fields backup file...');
    cy.task('findFiles', BACKUP_FILE_PATH).then((fileExists) => {
      if (!fileExists) {
        cy.log('No custom fields backup file found - skipping restoration');
        cy.log(`   Expected location: ${BACKUP_FILE_PATH}`);
        return;
      }

      cy.readFile(BACKUP_FILE_PATH, { timeout: 10000 }).then((backupData) => {
        cy.log(`- Backup file found: ${BACKUP_FILE_PATH}`);
        const customFields = backupData.customFields;
        if (!customFields || !customFields.length) {
          cy.log('No custom fields data found in backup file - skipping restoration');
          return;
        }

        const updatedBody = { customFields };
        cy.log('Restoring user custom fields...');
        CustomFields.updateCustomFieldsViaApi(updatedBody, usersModuleId, true).then((response) => {
          if (response.status === 204) {
            cy.log('- All custom fields restored');
          } else {
            cy.log(`⚠ Failed to restore custom fields (status: ${response.status})`);
          }
        });
      });
    });
  });
});
