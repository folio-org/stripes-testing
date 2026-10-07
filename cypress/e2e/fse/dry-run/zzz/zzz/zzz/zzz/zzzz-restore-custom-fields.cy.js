import CustomFields from '../../../../../../../support/fragments/settings/users/customFields';

describe('Restore user custom fields from the back-up', () => {
  const BACKUP_FILE_PATH = 'cypress/fixtures/backup/custom-fields-backup.json';

  before('Get admin token', () => {
    cy.getAdminToken();
  });

  it('C00003 Restore custom fields', { tags: ['dryRun', 'C00003'] }, () => {
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

        cy.log('Restoring user custom fields...');
        CustomFields.setCustomFieldsViaApi(customFields).then((response) => {
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
