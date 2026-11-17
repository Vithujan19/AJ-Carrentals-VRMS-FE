import { useAuth } from '../auth/AuthContext.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Good to see you, {user.displayName.split(' ')[0]}</h1>
          <p className="text-secondary mb-0">Your access is based on your current staff permissions.</p>
        </div>
      </div>
      <section className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="content-card h-100">
            <p className="eyebrow">ACCOUNT</p>
            <h2 className="h5">Your staff profile</h2>
            <dl className="row mb-0">
              <dt className="col-sm-4">Name</dt>
              <dd className="col-sm-8">{user.displayName}</dd>
              <dt className="col-sm-4">Email</dt>
              <dd className="col-sm-8">{user.email}</dd>
              <dt className="col-sm-4">Role(s)</dt>
              <dd className="col-sm-8">{user.roles.map(({ name }) => name).join(', ')}</dd>
            </dl>
          </div>
        </div>
        <div className="col-12 col-lg-5">
          <div className="content-card h-100">
            <p className="eyebrow">ACCESS</p>
            <h2 className="h5">Granted permissions</h2>
            <div className="permission-tags">
              {user.permissions.map((permission) => <span key={permission}>{permission}</span>)}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
