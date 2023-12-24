import uuid from 'uuid';

import { Button } from '../../../../../../interactors';
import ResultsPane from '../resultsPane';
import FieldMappingProfileEditForm from './fieldMappingProfileEditForm';
import FieldMappingProfileView from './fieldMappingProfileView';
import getRandomPostfix from '../../../../utils/stringTools';

const mappingDetails = {
  MARC_AUTHORITY: {
    name: 'marcAuthority',
    recordType: 'MARC_AUTHORITY',
    marcMappingOption: 'UPDATE',
    mappingFields: [
      {
        name: 'discoverySuppress',
        enabled: true,
        path: 'marcAuthority.discoverySuppress',
        value: null,
        booleanFieldAction: 'IGNORE',
        subfields: [],
      },
      {
        name: 'hrid',
        enabled: true,
        path: 'marcAuthority.hrid',
        value: '',
        subfields: [],
      },
    ],
  },
  ITEM: {
    name: 'item',
    recordType: 'ITEM',
    mappingFields: [
      {
        name: 'discoverySuppress',
        enabled: true,
        path: 'item.discoverySuppress',
        value: null,
        subfields: [],
      },
      { name: 'hrid', enabled: true, path: 'item.hrid', value: '', subfields: [] },
      { name: 'barcode', enabled: true, path: 'item.barcode', value: '', subfields: [] },
      {
        name: 'accessionNumber',
        enabled: true,
        path: 'item.accessionNumber',
        value: '',
        subfields: [],
      },
      {
        name: 'itemIdentifier',
        enabled: true,
        path: 'item.itemIdentifier',
        value: '',
        subfields: [],
      },
      { name: 'formerIds', enabled: true, path: 'item.formerIds[]', value: '', subfields: [] },
      {
        name: 'statisticalCodeIds',
        enabled: true,
        path: 'item.statisticalCodeIds[]',
        value: '',
        subfields: [],
      },
      {
        name: 'administrativeNotes',
        enabled: true,
        path: 'item.administrativeNotes[]',
        value: '',
        subfields: [],
      },
      {
        name: 'materialType.id',
        enabled: true,
        path: 'item.materialType.id',
        value: '',
        subfields: [],
        acceptedValues: {},
      },
      { name: 'copyNumber', enabled: true, path: 'item.copyNumber', value: '', subfields: [] },
      {
        name: 'itemLevelCallNumberTypeId',
        enabled: true,
        path: 'item.itemLevelCallNumberTypeId',
        value: '',
        subfields: [],
        acceptedValues: {},
      },
      {
        name: 'itemLevelCallNumberPrefix',
        enabled: true,
        path: 'item.itemLevelCallNumberPrefix',
        value: '',
        subfields: [],
      },
      {
        name: 'itemLevelCallNumber',
        enabled: true,
        path: 'item.itemLevelCallNumber',
        value: '',
        subfields: [],
      },
      {
        name: 'itemLevelCallNumberSuffix',
        enabled: true,
        path: 'item.itemLevelCallNumberSuffix',
        value: '',
        subfields: [],
      },
      {
        name: 'numberOfPieces',
        enabled: true,
        path: 'item.numberOfPieces',
        value: '',
        subfields: [],
      },
      {
        name: 'descriptionOfPieces',
        enabled: true,
        path: 'item.descriptionOfPieces',
        value: '',
        subfields: [],
      },
      { name: 'enumeration', enabled: true, path: 'item.enumeration', value: '', subfields: [] },
      { name: 'chronology', enabled: true, path: 'item.chronology', value: '', subfields: [] },
      { name: 'volume', enabled: true, path: 'item.volume', value: '', subfields: [] },
      {
        name: 'yearCaption',
        enabled: true,
        path: 'item.yearCaption[]',
        value: '',
        subfields: [],
      },
      {
        name: 'numberOfMissingPieces',
        enabled: true,
        path: 'item.numberOfMissingPieces',
        value: '',
        subfields: [],
      },
      {
        name: 'missingPieces',
        enabled: true,
        path: 'item.missingPieces',
        value: '',
        subfields: [],
      },
      {
        name: 'missingPiecesDate',
        enabled: true,
        path: 'item.missingPiecesDate',
        value: '',
        subfields: [],
      },
      {
        name: 'itemDamagedStatusId',
        enabled: true,
        path: 'item.itemDamagedStatusId',
        value: '',
        subfields: [],
        acceptedValues: {},
      },
      {
        name: 'itemDamagedStatusDate',
        enabled: true,
        path: 'item.itemDamagedStatusDate',
        value: '',
        subfields: [],
      },
      { name: 'notes', enabled: true, path: 'item.notes[]', value: '', subfields: [] },
      {
        name: 'permanentLoanType.id',
        enabled: true,
        path: 'item.permanentLoanType.id',
        value: '',
        subfields: [],
        acceptedValues: {},
      },
      {
        name: 'temporaryLoanType.id',
        enabled: true,
        path: 'item.temporaryLoanType.id',
        value: '',
        subfields: [],
        acceptedValues: {},
      },
      { name: 'status.name', enabled: true, path: 'item.status.name', value: '', subfields: [] },
      {
        name: 'circulationNotes',
        enabled: true,
        path: 'item.circulationNotes[]',
        value: '',
        subfields: [],
      },
      {
        name: 'permanentLocation.id',
        enabled: true,
        path: 'item.permanentLocation.id',
        value: '',
        subfields: [],
        acceptedValues: {},
      },
      {
        name: 'temporaryLocation.id',
        enabled: true,
        path: 'item.temporaryLocation.id',
        value: '',
        subfields: [],
        acceptedValues: {},
      },
      {
        name: 'electronicAccess',
        enabled: true,
        path: 'item.electronicAccess[]',
        value: '',
        subfields: [],
      },
    ],
  },
  HOLDINGS: {
    name: 'holdings',
    recordType: 'HOLDINGS',
    mappingFields: [
      {
        name: 'discoverySuppress',
        enabled: true,
        path: 'holdings.discoverySuppress',
        value: '',
        subfields: [],
      },
      {
        name: 'hrid',
        enabled: false,
        path: 'holdings.discoverySuppress',
        value: '',
        subfields: [],
      },
      {
        name: 'formerIds',
        enabled: true,
        path: 'holdings.formerIds[]',
        value: '',
        subfields: [],
      },
      {
        name: 'holdingsTypeId',
        enabled: true,
        path: 'holdings.holdingsTypeId',
        value: '',
        subfields: [],
      },
      {
        name: 'statisticalCodeIds',
        enabled: true,
        path: 'holdings.statisticalCodeIds[]',
        value: '',
        subfields: [],
      },
      {
        name: 'administrativeNotes',
        enabled: true,
        path: 'holdings.administrativeNotes[]',
        value: '',
        subfields: [],
      },
      {
        name: 'shelvingOrder',
        enabled: true,
        path: 'holdings.shelvingOrder',
        value: '',
        subfields: [],
      },
      {
        name: 'shelvingTitle',
        enabled: true,
        path: 'holdings.shelvingTitle',
        value: '',
        subfields: [],
      },
      {
        name: 'copyNumber',
        enabled: true,
        path: 'holdings.copyNumber',
        value: '',
        subfields: [],
      },
      {
        name: 'callNumberTypeId',
        enabled: true,
        path: 'holdings.callNumberTypeId',
        value: '',
        subfields: [],
      },
      {
        name: 'callNumberPrefix',
        enabled: true,
        path: 'holdings.callNumberPrefix',
        value: '',
        subfields: [],
      },
      {
        name: 'callNumber',
        enabled: true,
        path: 'holdings.callNumber',
        value: '',
        subfields: [],
      },
      {
        name: 'callNumberSuffix',
        enabled: true,
        path: 'holdings.callNumberSuffix',
        value: '',
        subfields: [],
      },
      {
        name: 'numberOfItems',
        enabled: true,
        path: 'holdings.numberOfItems',
        value: '',
        subfields: [],
      },
      {
        name: 'holdingsStatements',
        enabled: true,
        path: 'holdings.holdingsStatements[]',
        value: '',
        subfields: [],
      },
      {
        name: 'holdingsStatementsForSupplements',
        enabled: true,
        path: 'holdings.holdingsStatementsForSupplements[]',
        value: '',
        subfields: [],
      },
      {
        name: 'holdingsStatementsForIndexes',
        enabled: true,
        path: 'holdings.holdingsStatementsForIndexes[]',
        value: '',
        subfields: [],
      },
      {
        name: 'illPolicyId',
        enabled: true,
        path: 'holdings.illPolicyId',
        value: '',
        subfields: [],
      },
      {
        name: 'digitizationPolicy',
        enabled: true,
        path: 'holdings.digitizationPolicy',
        value: '',
        subfields: [],
      },
      {
        name: 'retentionPolicy',
        enabled: true,
        path: 'holdings.retentionPolicy',
        value: '',
        subfields: [],
      },
      {
        name: 'notes',
        enabled: true,
        path: 'holdings.notes[]',
        value: '',
        subfields: [],
      },
      {
        name: 'electronicAccess',
        enabled: true,
        path: 'holdings.electronicAccess[]',
        value: '',
        subfields: [],
      },
      {
        name: 'receivingHistory.entries',
        enabled: true,
        path: 'holdings.receivingHistory.entries[]',
        value: '',
        subfields: [],
      },
    ],
  },
};

const marcAuthorityUpdateMappingProfile = {
  profile: {
    name: `Update MARC authority records mapping profile${getRandomPostfix()}`,
    incomingRecordType: 'MARC_AUTHORITY',
    existingRecordType: 'MARC_AUTHORITY',
    description: '',
    mappingDetails: mappingDetails.MARC_AUTHORITY,
  },
  addedRelations: [],
  deletedRelations: [],
};

export default {
  ...ResultsPane,
  clickCreateNewFieldMappingProfile() {
    ResultsPane.expandActionsDropdown();
    cy.do(Button('New field mapping profile').click());
    FieldMappingProfileEditForm.waitLoading();
    FieldMappingProfileEditForm.verifyFormView();

    return FieldMappingProfileEditForm;
  },
  openFieldMappingProfileView({ name, type }) {
    ResultsPane.searchByName(name);
    FieldMappingProfileView.waitLoading();
    FieldMappingProfileView.verifyFormView({ type });

    return FieldMappingProfileView;
  },
  marcAuthorityUpdateMappingProfile,
  getDefaultMappingProfile({
    incomingRecordType = 'MARC_AUTHORITY',
    existingRecordType = 'MARC_AUTHORITY',
    id = uuid(),
    name,
  } = {}) {
    return {
      profile: {
        id,
        name:
          name ||
          `autotest_${existingRecordType.toLowerCase()}_mapping_profile_${getRandomPostfix()}`,
        incomingRecordType,
        existingRecordType,
        description: '',
        mappingDetails: mappingDetails[existingRecordType],
      },
      addedRelations: [],
      deletedRelations: [],
    };
  },
  createMappingProfileViaApi: (mappingProfile = marcAuthorityUpdateMappingProfile) => cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/mappingProfiles',
    body: mappingProfile,
    isDefaultSearchParamsRequired: false,
  }),
  unlinkMappingProfileFromActionProfileApi: (id, linkedMappingProfile) => cy.okapiRequest({
    method: 'PUT',
    path: `data-import-profiles/mappingProfiles/${id}`,
    body: linkedMappingProfile,
    isDefaultSearchParamsRequired: false,
  }),
  deleteMappingProfileViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-import-profiles/mappingProfiles/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
