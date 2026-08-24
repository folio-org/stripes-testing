const PACKAGE = 'Package';
const TITLE = 'Title';
const EXTERNAL = 'external';
const DETACHED = 'detached';
const EKB_TITLE = 'EKB-TITLE';

export const isPackage = (resource) => {
  return resource.class === 'org.olf.kb.Pkg' || resource.reference_object?.type === PACKAGE;
};

export const isExternal = (resource) => {
  return resource.type === EXTERNAL;
};

export const isDetached = (resource) => {
  return resource.type === DETACHED;
};

export const getEResourceCount = (resource) => {
  const RESOLVERS = [
    {
      selector: (r) => !Object.keys(r).length,
      value: null,
    },
    {
      selector: (r) => isDetached(r),
      value: '-',
    },
    {
      selector: (r) => isExternal(r),
      resolve: (r) => {
        const { reference_object: { isSelected, titleCount, selectedCount } = {} } = r;

        if (titleCount >= 0) {
          return selectedCount >= 0 ? `${selectedCount} / ${titleCount}` : titleCount;
        }

        if (resource?.authority === EKB_TITLE) {
          return isSelected ? '1 / 1' : '0 / 1';
        }

        return undefined;
      },
    },
    {
      selector: (r) => r.titleCount && r.titleCount >= 0,
      resolve: (r) => (r?.selectedCount >= 0 ? `${r.selectedCount} / ${r.titleCount}` : r.titleCount),
    },
    {
      selector: () => true,
      resolve: (r) => r.resourceCount ?? r._object?.resourceCount ?? 1,
    },
  ];

  const resolver = RESOLVERS.find(({ selector }) => selector(resource));

  return resolver?.value || resolver.resolve(resource);
};

export const getEResourceProvider = (resource) => {
  const resourceObject = resource._object ?? resource;

  return (
    resourceObject?.pkg?.vendor?.name ??
    resourceObject?.vendor?.name ??
    resourceObject?.reference_object?.provider ??
    resourceObject?.providerName ??
    null
  );
};

export const getEResourceType = (resource) => {
  if (isPackage(resource)) return PACKAGE;

  return (
    resource?._object?.pti?.titleInstance?.publicationType?.label ||
    resource?.reference_object?.publicationType ||
    resource?.publicationType?.label ||
    TITLE
  );
};
