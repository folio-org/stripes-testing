import Affiliations from '../../../support/dictionary/affiliations';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let locationId;
let consortiaId;
const randomPostfix = getRandomPostfix();
const sharedInstanceFromCentral = {
  title: `AT_C958466_SharedFromCentral_${randomPostfix}`,
  uuid: null,
};
const sharedInstanceFromMember = {
  title: `AT_C958466_SharedFromMember_${randomPostfix}`,
  uuid: null,
  hrid: null,
  holdings: null,
};
const sharedFromCentralExportedFromCentralTenant = `AT_C958466_sharedFromCentral_exportedFromCentral_${randomPostfix}.mrc`;
const sharedFromMemberExportedFromCentralTenant = `AT_C958466_sharedFromMember_exportedFromCentral_${randomPostfix}.mrc`;
const sharedFromCentralExportedFromMemberTenant = `AT_C958466_sharedFromCentral_exportedFromMember_${randomPostfix}.mrc`;
const sharedFromMemberExportedFromMemberTenant = `AT_C958466_sharedFromMember_exportedFromMember_${randomPostfix}.mrc`;

describe('Data Export', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((id) => {
        consortiaId = id;
      });
      cy.withinTenant(Affiliations.Consortia, () => {
        cy.createSimpleMarcBibViaAPI(sharedInstanceFromCentral.title).then((instanceId) => {
          sharedInstanceFromCentral.uuid = instanceId;
        });
      });
      cy.withinTenant(Affiliations.College, () => {
        cy.getLocations({ limit: 1 }).then((res) => {
          locationId = res.code;
        });

        cy.createSimpleMarcBibViaAPI(sharedInstanceFromMember.title).then((instanceId) => {
          sharedInstanceFromMember.uuid = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            sharedInstanceFromMember.hrid = instanceData.hrid;

            cy.createSimpleMarcHoldingsViaAPI(
              sharedInstanceFromMember.uuid,
              sharedInstanceFromMember.hrid,
              locationId,
            ).then((holdingId) => {
              sharedInstanceFromMember.holdings = { id: holdingId };

              InventoryInstance.shareInstanceViaApi(
                sharedInstanceFromMember.uuid,
                consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        if (sharedInstanceFromMember.holdings) {
          cy.deleteHoldingRecordViaApi(sharedInstanceFromMember.holdings.id);
        }
      });

      cy.withinTenant(Affiliations.Consortia, () => {
        InventoryInstance.deleteInstanceViaApi(sharedInstanceFromCentral.uuid);
        InventoryInstance.deleteInstanceViaApi(sharedInstanceFromMember.uuid);
      });

      FileManager.deleteFile(`cypress/fixtures/${sharedFromCentralExportedFromCentralTenant}`);
      FileManager.deleteFile(`cypress/fixtures/${sharedFromMemberExportedFromCentralTenant}`);
      FileManager.deleteFile(`cypress/fixtures/${sharedFromCentralExportedFromMemberTenant}`);
      FileManager.deleteFile(`cypress/fixtures/${sharedFromMemberExportedFromMemberTenant}`);
    });

    // Will fail on Sunflower untill CSP #5 (https://folio-org.atlassian.net/browse/MDEXP-878)

    it(
      'C958466 Verify /data-export/download-record/{recordId} endpoint for shared MARC Instance record (consortia) (firebird)',
      { tags: ['extendedPathECS', 'firebird', 'C958466'] },
      () => {
        // Step 1-2: Send GET request /data-export/download-record/{recordId} against Member tenant with idType=INSTANCE and save responses to .mrc files
        cy.withinTenant(Affiliations.College, () => {
          cy.downloadDataExportRecordViaApi(sharedInstanceFromCentral.uuid, 'INSTANCE').then(
            (body) => {
              cy.wrap(body).should('include', sharedInstanceFromCentral.uuid);
              FileManager.createFile(
                `cypress/fixtures/${sharedFromCentralExportedFromMemberTenant}`,
                body,
              );
            },
          );

          cy.downloadDataExportRecordViaApi(sharedInstanceFromMember.uuid, 'INSTANCE').then(
            (body) => {
              cy.wrap(body).should('include', sharedInstanceFromMember.uuid);
              FileManager.createFile(
                `cypress/fixtures/${sharedFromMemberExportedFromMemberTenant}`,
                body,
              );
            },
          );
        });

        // Step 3-4: Send GET request /data-export/download-record/{recordId} against Central tenant with idType=INSTANCE and save responses to .mrc files
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.downloadDataExportRecordViaApi(sharedInstanceFromCentral.uuid, 'INSTANCE').then(
            (body) => {
              cy.wrap(body).should('include', sharedInstanceFromCentral.uuid);
              FileManager.createFile(
                `cypress/fixtures/${sharedFromCentralExportedFromCentralTenant}`,
                body,
              );
            },
          );

          cy.downloadDataExportRecordViaApi(sharedInstanceFromMember.uuid, 'INSTANCE').then(
            (body) => {
              cy.wrap(body).should('include', sharedInstanceFromMember.uuid);
              FileManager.createFile(
                `cypress/fixtures/${sharedFromMemberExportedFromCentralTenant}`,
                body,
              );
            },
          );
        });

        // Step 5: Compare records from the files exported from Central tenant (Step 2) and Member tenant (Step 4)
        FileManager.verifyFilesHaveEqualContent(
          `cypress/fixtures/${sharedFromCentralExportedFromCentralTenant}`,
          `cypress/fixtures/${sharedFromCentralExportedFromMemberTenant}`,
          'binary',
        );

        FileManager.verifyFilesHaveEqualContent(
          `cypress/fixtures/${sharedFromMemberExportedFromCentralTenant}`,
          `cypress/fixtures/${sharedFromMemberExportedFromMemberTenant}`,
          'binary',
        );

        // Step 6: Send GET request /data-export/download-record/{recordId} against Member tenant with idType=INSTANCE and suppress999ff=true
        cy.withinTenant(Affiliations.College, () => {
          cy.downloadDataExportRecordViaApi(sharedInstanceFromCentral.uuid, 'INSTANCE', {
            suppress999ff: 'true',
          }).then((body) => {
            cy.wrap(body).should('not.include', sharedInstanceFromCentral.uuid);
          });
        });
      },
    );
  });
});
