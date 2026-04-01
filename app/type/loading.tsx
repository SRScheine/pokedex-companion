const TypeLoading = () => {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="skeleton mb-2 h-8 w-48 rounded-lg" />
      <div className="skeleton mb-8 h-4 w-96 rounded-lg" />
      <div className="skeleton h-[600px] w-full rounded-2xl" />
    </div>
  );
};

export default TypeLoading;
