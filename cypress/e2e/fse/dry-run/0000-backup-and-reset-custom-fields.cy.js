import CustomFields from '../../../support/fragments/settings/users/customFields';

describe('Backup and reset of user custom fields', () => {
  const BACKUP_FILE_PATH = 'cypress/fixtures/backup/custom-fields-backup.json';

  before('Get admin token', () => {
    cy.getAdminToken();
    cy.log('Cleaning up previous custom fields backup file (if any)...');
    cy.task('deleteFile', BACKUP_FILE_PATH, { log: true });
  });

  it(
    'C00001 Backup user custom fields and set all as not required',
    { tags: ['dryRun', 'C00001'] },
    () => {
      cy.log('Backing up user custom fields...');
      CustomFields.getCustomFieldsViaApi().then((getBody) => {
        if (getBody.customFields.length) {
          if (getBody.customFields.filter((field) => field.required).length) {
            cy.writeFile(BACKUP_FILE_PATH, getBody, { log: true }).then(() => {
              cy.log(`- Backup saved to ${BACKUP_FILE_PATH}`);

              const updatedCustomFields = getBody.customFields.map((field) => ({
                ...field,
                required: false,
              }));
              cy.log('Setting all custom fields as not required...');
              CustomFields.setCustomFieldsViaApi(updatedCustomFields).then((response) => {
                if (response.status === 204) {
                  cy.log('- All custom fields set as not required');
                } else {
                  cy.log(`⚠ Failed to update custom fields (status: ${response.status})`);
                }
              });
            });
          } else cy.log('- No required custom fields: no need to update');
        } else cy.log('- No custom fields found to backup');
      });
    },
  );
});
