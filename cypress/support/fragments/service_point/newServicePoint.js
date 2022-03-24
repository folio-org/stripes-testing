
import uuid from 'uuid';
import NewServicePoint from './defaultServicePoint';

const servicePoint = { ...NewServicePoint.defaultUiServicePoint };
const institution = { ...NewServicePoint.defaultUiInstitutions };
const librarie = { ...NewServicePoint.defaultUiLibraries };
const campuse = { ...NewServicePoint.defaultUiCampuses };
const location = { ...NewServicePoint.defaultUiLocations };

export default {

  createServicePoint: () => {
    cy.getServicePointsApi({ method: 'POST', body: servicePoint.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getInstitutionApi({ method: 'POST', body: institution.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getCampusesApi({ method: 'POST', body:campuse.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getLibrariesApi({ method: 'POST', body: librarie.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getLocations({ method: 'POST', bodu: location.body })
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
