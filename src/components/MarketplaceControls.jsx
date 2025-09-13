import React from 'react';
import { Search, ArrowDownUp, Filter, User } from 'lucide-react';

const MarketplaceControls = ({
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  filterType,
  setFilterType,
  filterToOwned,
  setFilterToOwned,
}) => {
  return (
    <div className="bg-gray-800/60 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-700 mb-6 flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-grow w-full md:w-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-700 text-white p-2 pl-10 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
        <div className="relative">
          <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full sm:w-auto bg-gray-700 text-white p-2 pl-10 rounded-lg border border-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="date-desc">Newest</option>
            <option value="date-asc">Oldest</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="name-asc">Name: A-Z</option>
            <option value="name-desc">Name: Z-A</option>
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto bg-gray-700 text-white p-2 pl-10 rounded-lg border border-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="official">Official</option>
            <option value="user">Community</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-white">
          <input
            type="checkbox"
            checked={filterToOwned}
            onChange={(e) => setFilterToOwned(e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
          />
          Show only my DATs
        </label>
      </div>
    </div>
  );
};

export default MarketplaceControls;
