import { REQUEST_METHOD } from '../../../support/constants';
import {
  compareSpecifications,
  findSpecificationByProfile,
  formatDifferencesSummary,
} from '../../../support/utils/specification-comparator';

describe('MARC Specifications - Restore from Backup', () => {
  const BACKUP_FILE_PATH = 'cypress/fixtures/backup/specifications-backup.json';
  const SPECIFICATION_PROFILES = ['bibliographic', 'authority', 'holdings'];

  before('Get admin token', () => {
    cy.getAdminToken();
  });

  it('Restore MARC specifications from backup if modified', { tags: ['dryRun'] }, () => {
    cy.log('🔍 Checking for backup file...');

    // Step 1: Check if backup file exists (use failOnStatusCode: false equivalent)
    cy.task('findFiles', BACKUP_FILE_PATH).then((fileExists) => {
      if (!fileExists) {
        cy.log('ℹ️  No backup file found - skipping restoration');
        cy.log(`   Expected location: ${BACKUP_FILE_PATH}`);
        cy.log('   This is normal if setup test did not run or was skipped');
        return;
      }

      cy.readFile(BACKUP_FILE_PATH, { timeout: 10000 }).then((backupData) => {
        cy.log(`✓ Backup file found: ${BACKUP_FILE_PATH}`);
        expect(backupData).to.have.property('specifications');

        const originalSpecs = backupData.specifications;
        cy.log(`📦 Original backup contains ${originalSpecs.length} specifications`);

        // Step 2: Fetch current state
        cy.log('📥 Fetching current specification state...');

        cy.okapiRequest({
          method: REQUEST_METHOD.GET,
          path: 'specification-storage/specifications',
          searchParams: {
            include: 'all',
          },
          isDefaultSearchParamsRequired: false,
        }).then((response) => {
          expect(response.status).to.eq(200);

          const currentSpecs = response.body.specifications;
          cy.log(`✓ Fetched current state: ${currentSpecs.length} specifications`);

          // Step 3: Compare and restore each specification
          cy.log('');
          cy.log('🔄 Comparing and restoring specifications...');
          cy.log('');

          const restorationResults = {
            totalFields: 0,
            totalSubfields: 0,
            totalIndicators: 0,
            totalIndicatorCodes: 0,
            restoredFields: 0,
            restoredSubfields: 0,
            restoredIndicators: 0,
            restoredIndicatorCodes: 0,
            errors: [],
          };

          // Collect all changes from all specifications
          const allChanges = [];

          SPECIFICATION_PROFILES.forEach((profile) => {
            const originalSpec = findSpecificationByProfile(originalSpecs, profile);
            const currentSpec = findSpecificationByProfile(currentSpecs, profile);

            if (!originalSpec) {
              cy.log(`⚠ No backup found for ${profile} specification`);
              return;
            }

            if (!currentSpec) {
              cy.log(`⚠ ${profile} specification not found in current state`);
              return;
            }

            cy.log(`Comparing ${profile} specification...`);

            // Compare specifications
            const differences = compareSpecifications(originalSpec, currentSpec);

            restorationResults.totalFields += differences.stats.totalFields;
            restorationResults.totalSubfields += differences.stats.totalSubfields;
            restorationResults.totalIndicators += differences.stats.totalIndicators;
            restorationResults.totalIndicatorCodes += differences.stats.totalIndicatorCodes;

            const summary = formatDifferencesSummary(differences);
            cy.log(`  ${profile}: ${summary}`);

            // Add changes to the list
            differences.fieldsToUpdate.forEach((change) => allChanges.push({ type: 'field', specificationId: currentSpec.id, ...change }));
            differences.subfieldsToUpdate.forEach((change) => allChanges.push({ type: 'subfield', ...change }));
            differences.indicatorsToUpdate.forEach((change) => allChanges.push({ type: 'indicator', ...change }));
            differences.indicatorCodesToUpdate.forEach((change) => allChanges.push({ type: 'indicatorCode', ...change }));
          });

          // Process all changes sequentially
          const processChange = (index) => {
            if (index >= allChanges.length) {
              // All changes processed, show summary
              cy.then(() => {
                cy.log('');
                cy.log('====================================');
                cy.log('📊 RESTORATION SUMMARY');
                cy.log('====================================');

                if (
                  restorationResults.restoredFields === 0 &&
                  restorationResults.restoredSubfields === 0 &&
                  restorationResults.restoredIndicators === 0 &&
                  restorationResults.restoredIndicatorCodes === 0
                ) {
                  cy.log('✅ No changes detected - specifications unchanged');
                } else {
                  cy.log('Total resources scanned:');
                  cy.log(`  • ${restorationResults.totalFields} fields`);
                  cy.log(`  • ${restorationResults.totalSubfields} subfields`);
                  cy.log(`  • ${restorationResults.totalIndicators} indicators`);
                  cy.log(`  • ${restorationResults.totalIndicatorCodes} indicator codes`);
                  cy.log('');
                  cy.log('Resources restored:');
                  if (restorationResults.restoredFields > 0) {
                    cy.log(`  ✓ ${restorationResults.restoredFields} fields`);
                  }
                  if (restorationResults.restoredSubfields > 0) {
                    cy.log(`  ✓ ${restorationResults.restoredSubfields} subfields`);
                  }
                  if (restorationResults.restoredIndicators > 0) {
                    cy.log(`  ✓ ${restorationResults.restoredIndicators} indicators`);
                  }
                  if (restorationResults.restoredIndicatorCodes > 0) {
                    cy.log(`  ✓ ${restorationResults.restoredIndicatorCodes} indicator codes`);
                  }
                }

                if (restorationResults.errors.length > 0) {
                  cy.log('');
                  cy.log(`⚠ Encountered ${restorationResults.errors.length} errors:`);
                  restorationResults.errors.slice(0, 10).forEach((error) => {
                    cy.log(`  • ${error}`);
                  });
                  if (restorationResults.errors.length > 10) {
                    cy.log(`  ... and ${restorationResults.errors.length - 10} more`);
                  }
                }

                cy.log('====================================');

                // Step 4: Clean up backup file
                cy.log('');
                cy.log('🧹 Cleaning up backup file...');

                cy.task('deleteFile', BACKUP_FILE_PATH, { log: false }).then((result) => {
                  cy.log(`✓ ${result}`);
                  cy.log('');
                  cy.log('🎉 Restoration complete!');
                });
              });
              return;
            }

            const change = allChanges[index];

            // Process based on change type
            if (change.type === 'field' && change.changeType === 'modified') {
              cy.updateSpecificationField(change.id, change.original, false).then(
                (updateResponse) => {
                  if (updateResponse.status >= 200 && updateResponse.status < 300) {
                    restorationResults.restoredFields++;
                    cy.log(
                      `    ✓ Restored field ${change.original.tag} (${change.changedFields.join(', ')})`,
                    );
                  } else {
                    restorationResults.errors.push(
                      `Field ${change.original.tag}: status ${updateResponse.status}`,
                    );
                  }
                  processChange(index + 1);
                },
              );
            } else if (change.type === 'field' && change.changeType === 'deleted') {
              cy.createSpecificationField(change.specificationId, change.original, false).then(
                (fieldResponse) => {
                  if (fieldResponse.status >= 200 && fieldResponse.status < 300) {
                    restorationResults.restoredFields++;
                    cy.log(`    ✓ Restored field ${change.original.tag} (re-created)`);

                    change.original.subfields?.forEach((originalSubfield) => {
                      cy.createSpecificationFieldSubfield(
                        fieldResponse.body?.id,
                        originalSubfield,
                        false,
                      ).then((subfieldResponse) => {
                        if (subfieldResponse.status >= 200 && subfieldResponse.status < 300) {
                          restorationResults.restoredSubfields++;
                          cy.log(`    ✓ Restored subfield ${originalSubfield.code} (re-created)`);
                        } else {
                          restorationResults.errors.push(
                            `Subfield ${originalSubfield.code}: status ${subfieldResponse.status}`,
                          );
                        }
                      });
                    });

                    change.original.indicators?.forEach((originalIndicator) => {
                      cy.createSpecificationFieldIndicator(
                        fieldResponse.body?.id,
                        originalIndicator,
                        false,
                      ).then((indicatorResponse) => {
                        if (indicatorResponse.status >= 200 && indicatorResponse.status < 300) {
                          restorationResults.restoredIndicators++;
                          cy.log(
                            `    ✓ Restored indicator ${originalIndicator.order} (re-created)`,
                          );

                          originalIndicator.codes?.forEach((originalCode) => {
                            cy.createSpecificationIndicatorCode(
                              indicatorResponse.body?.id,
                              originalCode,
                              false,
                            ).then((codeResponse) => {
                              if (codeResponse.status >= 200 && codeResponse.status < 300) {
                                restorationResults.restoredIndicatorCodes++;
                                cy.log(
                                  `    ✓ Restored indicator code '${originalCode.code}' (re-created)`,
                                );
                              } else {
                                restorationResults.errors.push(
                                  `Indicator code '${originalCode.code}': status ${codeResponse.status}`,
                                );
                              }
                            });
                          });
                        } else {
                          restorationResults.errors.push(
                            `Indicator ${originalIndicator.order}: status ${indicatorResponse.status}`,
                          );
                        }
                      });
                    });
                  } else {
                    restorationResults.errors.push(
                      `Field ${change.original.tag}: status ${fieldResponse.status}`,
                    );
                  }
                  processChange(index + 1);
                },
              );
            } else if (change.type === 'subfield') {
              cy.updateSpecificationSubfield(change.id, change.original, false).then(
                (updateResponse) => {
                  if (updateResponse.status >= 200 && updateResponse.status < 300) {
                    restorationResults.restoredSubfields++;
                    cy.log(
                      `    ✓ Restored subfield ${change.original.code} (${change.changedFields.join(', ')})`,
                    );
                  } else {
                    restorationResults.errors.push(
                      `Subfield ${change.original.code}: status ${updateResponse.status}`,
                    );
                  }
                  processChange(index + 1);
                },
              );
            } else if (change.type === 'indicator') {
              cy.updateSpecificationFieldIndicator(change.id, change.original, false).then(
                (updateResponse) => {
                  if (updateResponse.status >= 200 && updateResponse.status < 300) {
                    restorationResults.restoredIndicators++;
                    cy.log(
                      `    ✓ Restored indicator ${change.original.order} (${change.changedFields.join(', ')})`,
                    );
                  } else {
                    restorationResults.errors.push(
                      `Indicator ${change.original.order}: status ${updateResponse.status}`,
                    );
                  }
                  processChange(index + 1);
                },
              );
            } else if (change.type === 'indicatorCode') {
              cy.updateSpecificationIndicatorCode(change.id, change.original, false).then(
                (updateResponse) => {
                  if (updateResponse.status >= 200 && updateResponse.status < 300) {
                    restorationResults.restoredIndicatorCodes++;
                    cy.log(
                      `    ✓ Restored indicator code '${change.original.code}' (${change.changedFields.join(', ')})`,
                    );
                  } else {
                    restorationResults.errors.push(
                      `Indicator code '${change.original.code}': status ${updateResponse.status}`,
                    );
                  }
                  processChange(index + 1);
                },
              );
            }
          };

          // Start processing changes
          if (allChanges.length > 0) {
            processChange(0);
          } else {
            // No changes, just show summary and cleanup
            cy.log('');
            cy.log('====================================');
            cy.log('📊 RESTORATION SUMMARY');
            cy.log('====================================');
            cy.log('✅ No changes detected - specifications unchanged');
            cy.log('====================================');

            // Step 4: Clean up backup file
            cy.log('');
            cy.log('🧹 Cleaning up backup file...');

            cy.task('deleteFile', BACKUP_FILE_PATH, { log: false }).then((result) => {
              cy.log(`✓ ${result}`);
              cy.log('');
              cy.log('🎉 Restoration complete!');
            });
          }
        });
      });
    });
  });
});
