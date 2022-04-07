import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import MarcAuthoritiesSearch from '../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import { getLongDelay } from '../../support/utils/cypressTools';
import MarcAuthorityBrowse from '../../support/fragments/marcAuthority/MarcAuthorityBrowse';


let userId = '';
const marcAuthorityIds = new Set();


const importFile = (profileName) => {
  const uniqueFileName = `autotestFile.${getRandomPostfix()}.mrc`;
  cy.visit(TopMenu.dataImportPath);

  DataImport.uploadFile(MarcAuthority.defaultAuthority.name, uniqueFileName);
  JobProfiles.waitLoadingList();
  JobProfiles.select(profileName);
  JobProfiles.runImportFile(uniqueFileName);
  JobProfiles.openFileRecords(uniqueFileName);
  DataImport.getLinkToAuthority(MarcAuthority.defaultAuthority.headingReference).then(link => {
    const jobLogEntryId = link.split('/').at(-2);
    const recordId = link.split('/').at(-1);
    cy.intercept({
      method: 'GET',
      url: `/metadata-provider/jobLogEntries/${jobLogEntryId}/records/${recordId}`,
    }).as('getRecord');
    cy.visit(link);
    cy.wait('@getRecord', getLongDelay()).then(response => {
      const internalAuthorityId = response.response.body.relatedAuthorityInfo.idList[0];

      marcAuthorityIds.add(MarcAuthority.defaultAuthority.libraryOfCongressControlNumber);
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
      MarcAuthorities.select(internalAuthorityId);
      MarcAuthority.waitLoading();
    });
  });
};

describe('MARC Authority management', () => {
  beforeEach(() => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      // TODO: clarify why TCs doesn't have this permission in precondition(C350666)
      Permissions.dataImportUploadAll.gui,
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      importFile(MarcAuthority.defaultCreateJobProfile);
    });
  });

  it('C350572 Edit an Authority record', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);
    const addedInSourceRow = quickmarcEditor.addNewField();
    const updatedInSourceRow = quickmarcEditor.updateExistingField();
    QuickMarcEditor.pressSaveAndClose();
    MarcAuthority.waitLoading();
    MarcAuthority.contains(addedInSourceRow);
    MarcAuthority.contains(updatedInSourceRow);

    MarcAuthoritiesSearch.searchBy('Uniform title', updatedInSourceRow);
    MarcAuthorities.checkRow(updatedInSourceRow);
    MarcAuthorities.checkRowsCount(1);
  });

  it.only('C350667 Update a MARC authority record via data import. Record match with 010 $a', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    // preparing

    const mappingProfile = {
      'name': `Update MARC authority records mapping profile${getRandomPostfix()}`,
      'incomingRecordType': 'MARC_AUTHORITY',
      'existingRecordType': 'MARC_AUTHORITY',
      'mappingDetails': {
        'name': 'marcAuthority',
        'recordType': 'MARC_AUTHORITY',
        'marcMappingOption': 'UPDATE',
        'mappingFields': [
          {
            'name': 'discoverySuppress',
            'enabled': true,
            'path': 'marcAuthority.discoverySuppress',
            'value': null,
            'booleanFieldAction': 'IGNORE',
            'subfields': []
          },
          {
            'name': 'hrid',
            'enabled': true,
            'path': 'marcAuthority.hrid',
            'value': '',
            'subfields': []
          }
        ]
      }
    };

    cy.createMappingProfileApi(mappingProfile).then(mappingProfileResponse => {
      cy.createActionProfileApi({
        'profile': {
          'name': `Use this one to update MARC authority records - action profile${getRandomPostfix()}`,
          'action': 'UPDATE',
          'folioRecord': 'MARC_AUTHORITY'
        },
        'addedRelations': [
          {
            'masterProfileId': null,
            'masterProfileType': 'ACTION_PROFILE',
            'detailProfileId': mappingProfileResponse.body.id,
            'detailProfileType': 'MAPPING_PROFILE'
          }
        ]
      }).then(actionProfileResponse => {
        cy.createMatchProfileApi({
          'profile': {
            'name': `Update MARC authority record -  Match Profile 010 $a${getRandomPostfix()}`,
            'incomingRecordType': 'MARC_AUTHORITY',
            'matchDetails': [
              {
                'incomingRecordType': 'MARC_AUTHORITY',
                'incomingMatchExpression': {
                  'fields': [
                    {
                      'label': 'field',
                      'value': '010'
                    },
                    {
                      'label': 'recordSubfield',
                      'value': 'a'
                    }
                  ],
                },
                'existingRecordType': 'MARC_AUTHORITY',
                'existingMatchExpression': {
                  'fields': [
                    {
                      'label': 'field',
                      'value': '010'
                    },
                    {
                      'label': 'recordSubfield',
                      'value': 'a'
                    }
                  ],
                },
                'matchCriterion': 'EXACTLY_MATCHES'
              }
            ],
            'existingRecordType': 'MARC_AUTHORITY'
          },
        }).then(matchProfileResponse => {
          cy.createJobProfileApi({
            'profile': {
              'name': `Update MARC authority records - 010 $a${getRandomPostfix()}`,
              'dataType': 'MARC'
            },
            'addedRelations': [
              {
                'masterProfileId': null,
                'masterProfileType': 'JOB_PROFILE',
                'detailProfileId': matchProfileResponse.body.id,
                'detailProfileType': 'MATCH_PROFILE'
              },
              {
                'masterProfileId': matchProfileResponse.body.id,
                'masterProfileType': 'MATCH_PROFILE',
                'detailProfileId': actionProfileResponse.body.id,
                'detailProfileType': 'ACTION_PROFILE',
                'reactTo': 'MATCH'
              }
            ]
          }).then(jobProfileResponse => {
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);
            const addedInSourceRow = quickmarcEditor.addNewField();
            const updatedInSourceRow = quickmarcEditor.updateExistingField();
            QuickMarcEditor.pressSaveAndClose();

            cy.visit(TopMenu.dataImportPath);

            importFile(jobProfileResponse.body.profile.name);
            MarcAuthority.notContains(addedInSourceRow);
            MarcAuthority.notContains(updatedInSourceRow);

            // // change 010 tag to future runs ability
            // MarcAuthority.edit();
            // QuickMarcEditor.waitLoading();
            // quickmarcEditor.updateExistingField('010', getRandomPostfix());




            cy.deleteJobProfileApi(jobProfileResponse.body.id);

            cy.deleteMatchProfileApi(matchProfileResponse.body.id);
            // unlink mpaang profile and action profile
            const linkedMappingProfile = { id: mappingProfileResponse.body.id,
              profile:{ ...mappingProfile } };
            linkedMappingProfile.profile.id = mappingProfileResponse.body.id;
            linkedMappingProfile.addedRelations = [];
            linkedMappingProfile.deletedRelations = [
              {
                'masterProfileId': actionProfileResponse.body.id,
                'masterProfileType': 'ACTION_PROFILE',
                'detailProfileId': mappingProfileResponse.body.id,
                'detailProfileType': 'MAPPING_PROFILE'
              }];


            cy.unlinkMappingProfileFromActionProfileApi(mappingProfileResponse.body.id, linkedMappingProfile);
            cy.deleteMappingProfileApi(mappingProfileResponse.body.id);
            cy.deleteActionProfileApi(actionProfileResponse.body.id);
          });
        });
      });
    });
  });

  it('C350575  MARC Authority fields LEADER and 008 can not be deleted', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.checkNotDeletableTags('008', 'LDR');
  });

  it('C350575  Update 008 of Authority record', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);

    const changedValueInSourceRow = quickmarcEditor.updateAllDefaultValuesIn008TagInAuthority();
    MarcAuthority.waitLoading();
    MarcAuthority.contains(changedValueInSourceRow);
  });

  it('C350578 Browse existing Authorities', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    // make one more import to get 2 marc authorities to check browse functionality
    const secondFileName = `autotestFile.${getRandomPostfix()}_second.mrc`;
    cy.visit(TopMenu.dataImportPath);

    DataImport.uploadFile(MarcAuthority.defaultAuthority.name, secondFileName);
    JobProfiles.waitLoadingList();
    JobProfiles.select(MarcAuthority.defaulCretJobProfile);
    JobProfiles.runImportFile(secondFileName);

    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.switchToBrowse();
    MarcAuthorityBrowse.waitEmptyTable();
    MarcAuthorityBrowse.checkFiltersInitialState();
    MarcAuthorityBrowse.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
    MarcAuthorityBrowse.waitLoading();
    MarcAuthorityBrowse.checkPresentedColumns();
    // TODO: add checking of records order
  });

  afterEach(() => {
    marcAuthorityIds.forEach(marcAuthorityId => MarcAuthority.deleteViaAPI(marcAuthorityId));
    cy.deleteUser(userId);
  });
});
