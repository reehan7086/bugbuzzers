<div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => setCurrentView('signup')}
                  className="px-8 py-4 bg-white text-purple-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                >
                  Start Earning Rewards
                </button>
                <button 
                  onClick={() => setCurrentView('login')}
                  className="px-8 py-4 border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-purple-600 transition-all"
                >
                  I Have An Account
                </button>
              </div>
