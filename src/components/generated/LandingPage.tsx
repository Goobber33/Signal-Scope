import React from 'react';
import { motion } from 'framer-motion';
import { Signal, Map, BarChart3, Shield, Zap, Users, ArrowRight, CheckCircle, TowerControl, Activity, Globe } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted
}) => {
  // Animation variants
  const fadeInUp = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  const fadeIn = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1
    }
  };

  const scaleIn = {
    hidden: {
      opacity: 0,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      scale: 1
    }
  };

  const staggerContainer = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" 
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }} 
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }} 
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" 
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3]
          }} 
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }} 
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" 
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3]
          }} 
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }} 
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        className="relative z-10 px-6 py-4 border-b border-gray-800/50 backdrop-blur-xl" 
        initial={{
          y: -100,
          opacity: 0
        }} 
        animate={{
          y: 0,
          opacity: 1
        }} 
        transition={{
          duration: 0.6,
          ease: "easeOut"
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3" 
            initial={{
              x: -20,
              opacity: 0
            }} 
            animate={{
              x: 0,
              opacity: 1
            }} 
            transition={{
              duration: 0.6,
              delay: 0.2
            }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-600/20">
              <Signal size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SignalScope</h1>
              <p className="text-xs text-gray-400">Network Analytics Platform</p>
            </div>
          </motion.div>
          <motion.button 
            onClick={onGetStarted} 
            className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded-lg font-semibold transition-all shadow-lg shadow-pink-600/20" 
            initial={{
              x: 20,
              opacity: 0
            }} 
            animate={{
              x: 0,
              opacity: 1
            }} 
            transition={{
              duration: 0.6,
              delay: 0.2
            }} 
            whileHover={{
              scale: 1.05
            }} 
            whileTap={{
              scale: 0.95
            }}
          >
            Get Started
          </motion.button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div 
            className="inline-block mb-6" 
            initial={{
              opacity: 0,
              scale: 0.8
            }} 
            animate={{
              opacity: 1,
              scale: 1
            }} 
            transition={{
              duration: 0.5,
              delay: 0.3
            }}
          >
            <span className="px-4 py-2 bg-pink-600/10 border border-pink-600/20 rounded-full text-pink-400 text-sm font-medium">
              🚀 Professional Network Coverage Dashboard
            </span>
          </motion.div>

          <motion.h1 
            className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-pink-200 to-purple-200 bg-clip-text text-transparent" 
            initial={{
              opacity: 0,
              y: 30
            }} 
            animate={{
              opacity: 1,
              y: 0
            }} 
            transition={{
              duration: 0.8,
              delay: 0.4
            }}
          >
            Real-Time Network
            <br />
            Coverage Analytics
          </motion.h1>

          <motion.p 
            className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto" 
            initial={{
              opacity: 0,
              y: 20
            }} 
            animate={{
              opacity: 1,
              y: 0
            }} 
            transition={{
              duration: 0.8,
              delay: 0.5
            }}
          >
            Track tower locations, analyze signal strength, and visualize network coverage across the nation.
            Built for telecom professionals and network engineers.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center" 
            initial={{
              opacity: 0,
              y: 20
            }} 
            animate={{
              opacity: 1,
              y: 0
            }} 
            transition={{
              duration: 0.8,
              delay: 0.6
            }}
          >
            <motion.button 
              onClick={onGetStarted} 
              className="px-5 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded-xl font-semibold text-base sm:text-lg transition-all shadow-2xl shadow-pink-600/30 flex items-center gap-2" 
              whileHover={{
                scale: 1.05
              }} 
              whileTap={{
                scale: 0.95
              }}
            >
              Launch Dashboard
              <ArrowRight size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="mt-16 grid grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto" 
            variants={staggerContainer} 
            initial="hidden" 
            animate="visible"
          >
            {[
              {
                label: 'Cell Towers',
                value: '50K+',
                icon: TowerControl
              },
              {
                label: 'Signal Reports',
                value: '2M+',
                icon: Activity
              },
              {
                label: 'Coverage Areas',
                value: '500+',
                icon: Globe
              }
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                className="p-6 bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl" 
                variants={fadeInUp} 
                whileHover={{
                  scale: 1.05,
                  borderColor: 'rgba(219, 39, 119, 0.5)'
                }} 
                transition={{
                  duration: 0.3
                }}
              >
                <stat.icon className="mx-auto mb-2 text-pink-500" size={32} />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16" 
            initial="hidden" 
            whileInView="visible" 
            viewport={{
              once: true,
              amount: 0.3
            }} 
            variants={fadeInUp} 
            transition={{
              duration: 0.6
            }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-400">Everything you need for comprehensive network analysis</p>
          </motion.div>

          <motion.div 
            className="grid lg:grid-cols-3 gap-8" 
            variants={staggerContainer} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{
              once: true,
              amount: 0.2
            }}
          >
            {[
              {
                icon: Map,
                title: 'Interactive Mapping',
                description: 'Full-screen map with tower markers, coverage heatmaps, and real-time signal data visualization.',
                color: 'from-pink-600 to-purple-600'
              },
              {
                icon: BarChart3,
                title: 'Analytics Dashboard',
                description: 'Comprehensive charts and graphs showing signal trends, tower distribution, and coverage metrics.',
                color: 'from-purple-600 to-blue-600'
              },
              {
                icon: Shield,
                title: 'Secure Authentication',
                description: 'JWT-based authentication with protected routes, role management, and secure data access.',
                color: 'from-blue-600 to-cyan-600'
              },
              {
                icon: Activity,
                title: 'Signal Reporting',
                description: 'Users can submit real-time signal quality reports with GPS location, carrier info, and device details.',
                color: 'from-cyan-600 to-green-600'
              },
              {
                icon: Zap,
                title: 'Real-Time Updates',
                description: 'Live data synchronization with backend API for instant tower and coverage information updates.',
                color: 'from-green-600 to-yellow-600'
              },
              {
                icon: TowerControl,
                title: 'Tower Management',
                description: 'Comprehensive tower database with operator info, technology specs, height, and location details.',
                color: 'from-yellow-600 to-pink-600'
              }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                className="p-8 bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-2xl hover:border-gray-600 transition-all" 
                variants={fadeInUp} 
                whileHover={{
                  scale: 1.05,
                  y: -5
                }} 
                transition={{
                  duration: 0.3
                }}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16" 
            initial="hidden" 
            whileInView="visible" 
            viewport={{
              once: true,
              amount: 0.3
            }} 
            variants={fadeInUp} 
            transition={{
              duration: 0.6
            }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">Built with Modern Tech</h2>
            <p className="text-xl text-gray-400">Production-ready full-stack architecture</p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" 
            variants={staggerContainer} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{
              once: true,
              amount: 0.2
            }}
          >
            {[
              {
                name: 'React + TypeScript',
                desc: 'Type-safe frontend',
                color: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              },
              {
                name: 'FastAPI + Python',
                desc: 'High-performance backend',
                color: 'bg-green-500/10 border-green-500/30 text-green-400'
              },
              {
                name: 'MongoDB',
                desc: 'Flexible NoSQL database',
                color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
              },
              {
                name: 'Tailwind CSS',
                desc: 'Modern styling',
                color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              },
              {
                name: 'Mapbox/Leaflet',
                desc: 'Interactive maps',
                color: 'bg-purple-500/10 border-purple-500/30 text-purple-400'
              },
              {
                name: 'Recharts',
                desc: 'Beautiful charts',
                color: 'bg-pink-500/10 border-pink-500/30 text-pink-400'
              },
              {
                name: 'JWT Auth',
                desc: 'Secure tokens',
                color: 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              },
              {
                name: 'Vite',
                desc: 'Lightning fast',
                color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              }
            ].map((tech, i) => (
              <motion.div 
                key={i} 
                className={`p-6 border rounded-xl backdrop-blur-xl ${tech.color}`} 
                variants={scaleIn} 
                whileHover={{
                  scale: 1.05,
                  y: -3
                }} 
                transition={{
                  duration: 0.2
                }}
              >
                <h4 className="font-bold mb-1">{tech.name}</h4>
                <p className="text-sm opacity-80">{tech.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="relative z-10 px-6 py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial="hidden" 
              whileInView="visible" 
              viewport={{
                once: true,
                amount: 0.3
              }} 
              variants={staggerContainer}
            >
              <motion.h2 
                className="text-4xl lg:text-5xl font-bold mb-6" 
                variants={fadeInUp}
              >
                Professional-Grade
                <br />
                Network Intelligence
              </motion.h2>
              <motion.p 
                className="text-xl text-gray-400 mb-8" 
                variants={fadeInUp}
              >
                SignalScope provides telecom-quality analytics comparable to tools used by major carriers like T-Mobile, Verizon, and AT&T.
              </motion.p>
              <motion.div 
                className="space-y-4" 
                variants={staggerContainer}
              >
                {[
                  'FCC tower database integration with 50K+ locations',
                  'Coverage heatmap with signal strength estimation',
                  'User-submitted signal quality reports',
                  'Multi-carrier filtering and comparison',
                  'Real-time analytics and trend visualization',
                  'Secure multi-user authentication system'
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    className="flex items-start gap-3" 
                    variants={fadeInUp} 
                    whileHover={{
                      x: 5
                    }} 
                    transition={{
                      duration: 0.2
                    }}
                  >
                    <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-300">{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div 
              className="relative" 
              initial={{
                opacity: 0,
                x: 50
              }} 
              whileInView={{
                opacity: 1,
                x: 0
              }} 
              viewport={{
                once: true,
                amount: 0.3
              }} 
              transition={{
                duration: 0.8
              }}
            >
              <div className="aspect-square bg-gradient-to-br from-pink-600/20 to-purple-600/20 rounded-3xl border border-gray-700 backdrop-blur-xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                    animate={{
                      rotate: 360
                    }} 
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    <Map size={200} className="text-gray-700" />
                  </motion.div>
                </div>
                <motion.div 
                  className="absolute top-4 left-4 right-4 bg-gray-800/80 backdrop-blur-xl border border-gray-700 rounded-lg p-4" 
                  initial={{
                    y: -20,
                    opacity: 0
                  }} 
                  whileInView={{
                    y: 0,
                    opacity: 1
                  }} 
                  viewport={{
                    once: true
                  }} 
                  transition={{
                    duration: 0.6,
                    delay: 0.3
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div 
                      className="w-2 h-2 bg-green-500 rounded-full" 
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [1, 0.5, 1]
                      }} 
                      transition={{
                        duration: 2,
                        repeat: Infinity
                      }} 
                    />
                    <span className="text-sm font-medium">Live Monitoring</span>
                  </div>
                  <div className="text-xs text-gray-400">Tracking 847 towers in real-time</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            className="p-12 bg-gradient-to-br from-pink-600/10 to-purple-600/10 backdrop-blur-xl border border-pink-600/20 rounded-3xl" 
            initial="hidden" 
            whileInView="visible" 
            viewport={{
              once: true,
              amount: 0.3
            }} 
            variants={scaleIn} 
            transition={{
              duration: 0.6
            }}
          >
            <motion.h2 
              className="text-4xl lg:text-5xl font-bold mb-6" 
              variants={fadeInUp}
            >
              Ready to Track Network Coverage?
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-400 mb-8" 
              variants={fadeInUp}
            >
              Join thousands of network professionals using SignalScope for real-time coverage analytics.
            </motion.p>
            <motion.button 
              onClick={onGetStarted} 
              className="px-6 py-3 sm:px-10 sm:py-5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded-xl font-semibold text-base sm:text-xl transition-all shadow-2xl shadow-pink-600/30 inline-flex items-center gap-3" 
              variants={fadeInUp} 
              whileHover={{
                scale: 1.05
              }} 
              whileTap={{
                scale: 0.95
              }}
            >
              Get Started Now
              <ArrowRight size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
            <motion.p 
              className="mt-6 text-sm text-gray-500" 
              variants={fadeInUp}
            >
              Free for individual users • No credit card required
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer 
        className="relative z-10 px-6 py-12 border-t border-gray-800/50" 
        initial={{
          opacity: 0
        }} 
        whileInView={{
          opacity: 1
        }} 
        viewport={{
          once: true
        }} 
        transition={{
          duration: 0.6
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Signal size={24} className="text-white" />
              </div>
              <div>
                <div className="font-bold">SignalScope</div>
                <div className="text-xs text-gray-500">© 2024 All rights reserved</div>
              </div>
            </div>
            <div className="flex gap-8 text-sm text-gray-400">
              {['About', 'Documentation', 'API', 'Privacy', 'Terms'].map((link, i) => (
                <motion.a 
                  key={i} 
                  href="#" 
                  className="hover:text-white transition-colors" 
                  whileHover={{
                    y: -2
                  }} 
                  transition={{
                    duration: 0.2
                  }}
                >
                  {link}
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

