export type FinancialScope = 
  | { type: "PERSONAL"; id: string }
  | { type: "GROUP"; id: string };

/**
 * Returns the base Firestore path for a given FinancialScope.
 * For PERSONAL: 'users/{id}'
 * For GROUP: 'groups/{id}'
 */
export function getScopePath(scope: FinancialScope): [string, string] {
  if (scope.type === 'PERSONAL') {
    return ['users', scope.id];
  } else {
    return ['groups', scope.id];
  }
}
