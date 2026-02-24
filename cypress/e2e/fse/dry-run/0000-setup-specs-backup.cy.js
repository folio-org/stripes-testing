import { REQUEST_METHOD } from '../../../support/constants';

describe('MARC Specifications - Backup and Sync to LOC Defaults', () => {
  const BACKUP_FILE_PATH = 'cypress/fixtures/backup/specifications-backup.json';
  const SPECIFICATION_PROFILES = ['bibliographic', 'authority'];

  before('Get admin token', () => {
    cy.getAdminToken();
  });

  it('Backup all MARC specifications and sync to LOC defaults', { tags: ['dryRun'] }, () => {
    cy.log('📦 Backing up MARC specifications...');

    // Step 1: Fetch all specifications with full details (include=all)
    cy.okapiRequest({
      method: REQUEST_METHOD.GET,
      path: 'specification-storage/specifications',
      searchParams: {
        include: 'all',
      },
      isDefaultSearchParamsRequired: false,
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('specifications');

      const specifications = response.body.specifications;
      const specCount = specifications.length;

      cy.log(`✓ Fetched ${specCount} specifications from API`);

      // Verify we have the expected profiles
      SPECIFICATION_PROFILES.forEach((profile) => {
        const spec = specifications.find((s) => s.profile === profile);
        if (spec) {
          const fieldCount = spec.fields ? spec.fields.length : 0;
          cy.log(`  → ${profile}: ${fieldCount} fields`);
        } else {
          cy.log(`  ⚠ ${profile}: NOT FOUND`);
        }
      });

      // Step 2: Save backup to file
      cy.writeFile(BACKUP_FILE_PATH, response.body, { log: true }).then(() => {
        cy.log(`✓ Backup saved to ${BACKUP_FILE_PATH}`);
      });

      // Step 3: Sync each specification to LOC defaults
      cy.log('🔄 Syncing specifications to LOC defaults...');

      const syncResults = [];

      // Process specifications sequentially to avoid overwhelming the API
      const syncSpecification = (spec, index) => {
        if (index >= specifications.length) {
          // All done, show summary
          const successCount = syncResults.filter((r) => r.success).length;
          const failCount = syncResults.filter((r) => !r.success).length;

          cy.log('');
          cy.log('====================================');
          cy.log('📊 BACKUP & SYNC SUMMARY');
          cy.log('====================================');
          cy.log(`✓ Backed up ${specCount} specifications`);
          cy.log(`✓ Successfully synced ${successCount} specifications`);
          if (failCount > 0) {
            cy.log(`⚠ Failed to sync ${failCount} specifications`);
          }
          cy.log(`💾 Backup stored in: ${BACKUP_FILE_PATH}`);
          cy.log('====================================');
          cy.log('');
          cy.log('🎯 All tests will now run against LOC default specifications');
          cy.log('🔙 Original configuration will be restored after all tests complete');
          return;
        }

        const currentSpec = specifications[index];

        cy.okapiRequest({
          method: REQUEST_METHOD.POST,
          path: `specification-storage/specifications/${currentSpec.id}/sync`,
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
        }).then((syncResponse) => {
          if (syncResponse.status === 202 || syncResponse.status === 200) {
            cy.log(`✓ Synced ${currentSpec.profile} specification (${currentSpec.id})`);
            syncResults.push({ profile: currentSpec.profile, success: true });
          } else {
            cy.log(
              `⚠ Failed to sync ${currentSpec.profile} specification (status: ${syncResponse.status})`,
            );
            syncResults.push({ profile: currentSpec.profile, success: false });
          }

          // Process next specification
          syncSpecification(spec, index + 1);
        });
      };

      // Start syncing from first specification
      syncSpecification(specifications, 0);
    });
  });
});
