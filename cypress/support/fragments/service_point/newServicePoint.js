
import uuid from 'uuid';
import NewServicePoint from './defaultServicePoint';

export default {

  createServicePoint: () => {
    cy.getServicePointsApi({ method: 'POST', body: NewServicePoint.defaultUiServicePoint.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getInstitutionApi({ method: 'POST', body: NewServicePoint.defaultUiInstitutions.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getCampusesApi({ method: 'POST', body:NewServicePoint.defaultUiCampuses.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getLibrariesApi({ method: 'POST', body: NewServicePoint.defaultUiLibraries.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getLocations({ method: 'POST', bodu: NewServicePoint.defaultUiLocations.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },

  deleteServicePoint() {
    this.deleteLocations();
    this.deleteLibraries();
    this.deleteCampuses();
    this.deleteInstitutions();
    this.deleteNewServicePoint();
  },

  deleteLocations() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `locations/${uuid()}`,
    });
  },
  deleteLibraries() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/libraries/${uuid()}`,
    });
  },
  deleteCampuses() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/campuses/${uuid()}`,
    });
  },
  deleteInstitutions() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/institutions/${uuid()}`,
    });
  },
  deleteNewServicePoint() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `service-points/${uuid()}`,
    });
  },
};
