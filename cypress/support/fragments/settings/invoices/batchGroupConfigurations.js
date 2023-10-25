import uuid from 'uuid';

export default {
  getDefaultBatchGroupConfiguration({
    batchGroupId,
    startTime = null,
    weekdays = [],
    format = 'Application/xml',
    uploadURI = 'sftp://ftp.ci.folio.org',
    uploadDirectory = '/ftp/files/invoices',
    ftpFormat = 'SFTP',
    ftpPort = '22',
  } = {}) {
    return {
      id: uuid(),
      batchGroupId,
      startTime,
      weekdays,
      format,
      uploadURI,
      uploadDirectory,
      ftpFormat,
      ftpPort,
    };
  },
  getDefaultBatchGroupCredentials({ username = 'folio', password = 'Ffx29%pu', exportConfigId }) {
    return {
      username,
      password,
      exportConfigId,
      id: uuid(),
    };
  },
  getBatchGroupConfigurationsViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'batch-voucher/export-configurations',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.batchGroupConfigurations;
      });
  },
  getBatchGroupCredentialsViaApi(batchGroupCofigId) {
    return cy
      .okapiRequest({
        path: `batch-voucher/export-configurations/${batchGroupCofigId}/credentials`,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
  createBatchGroupConfigurationViaApi(batchGroupConfig) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'batch-voucher/export-configurations',
        body: batchGroupConfig,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        const credentials = this.getDefaultBatchGroupCredentials({
          exportConfigId: body.id,
        });
        this.createBatchGroupCredentialsViaApi(credentials);
      });
  },
  createBatchGroupCredentialsViaApi(credintials) {
    return cy.okapiRequest({
      method: 'POST',
      path: `batch-voucher/export-configurations/${credintials.exportConfigId}/credentials`,
      body: credintials,
      isDefaultSearchParamsRequired: false,
    });
  },
  updateBatchGroupCredentialsViaApi(credintials) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `batch-voucher/export-configurations/${credintials.exportConfigId}/credentials`,
      body: credintials,
      isDefaultSearchParamsRequired: false,
    });
  },
  deleteBatchGroupConfigurationViaApi(batchGroupCofigId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `batch-voucher/export-configurations/${batchGroupCofigId}`,
    });
  },
  deleteBatchGroupCredentialsViaApi(batchGroupCofigId, credentialsId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `batch-voucher/export-configurations/${batchGroupCofigId}/credentials/${credentialsId}`,
    });
  },
  deleteBatchGroupConfigurationWithCredentialsViaApi(batchGroupCofigId) {
    this.getBatchGroupCredentialsViaApi(batchGroupCofigId).then(({ id: credentialsId }) => {
      this.deleteBatchGroupCredentialsViaApi(batchGroupCofigId, credentialsId);
      this.deleteBatchGroupConfigurationViaApi(batchGroupCofigId);
    });
  },
};
