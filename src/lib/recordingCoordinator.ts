/**
 * Single writer pattern - BroadcastChannel coordination for recording
 * Ensures only one tab records at a time across browser instances
 */

export class RecordingCoordinator {
  private static instance: RecordingCoordinator;
  private channel: BroadcastChannel;
  private isLeader = false;
  private leaderId: string | null = null;
  private heartbeatInterval: number | null = null;
  private readonly myTabId = crypto.randomUUID();
  
  static getInstance(): RecordingCoordinator {
    if (!RecordingCoordinator.instance) {
      RecordingCoordinator.instance = new RecordingCoordinator();
    }
    return RecordingCoordinator.instance;
  }

  constructor() {
    this.channel = new BroadcastChannel('recording');
    this.initializeLeaderElection();
  }

  private initializeLeaderElection() {
    // Listen for leadership messages
    this.channel.addEventListener('message', (event) => {
      const { type, tabId, timestamp } = event.data;
      
      switch (type) {
        case 'LEADER_HEARTBEAT':
          if (tabId !== this.myTabId) {
            this.leaderId = tabId;
            // If we thought we were leader but someone else is, step down
            if (this.isLeader && tabId !== this.myTabId) {
              this.stepDown();
            }
          }
          break;
          
        case 'LEADER_ELECTION':
          // Respond with our candidacy if we can be leader
          this.respondToElection();
          break;
          
        case 'LEADER_CANDIDATE':
          // Check if this candidate should be leader
          if (tabId < this.myTabId && !this.isLeader) {
            // Let them be leader (deterministic by tab ID)
            this.leaderId = tabId;
          }
          break;
      }
    });

    // Start leader election process
    this.electLeader();
    
    // Check for leader timeouts
    setInterval(() => this.checkLeaderTimeout(), 5000);
  }

  private electLeader() {
    // Broadcast election call
    this.channel.postMessage({
      type: 'LEADER_ELECTION',
      tabId: this.myTabId,
      timestamp: Date.now()
    });

    // Announce candidacy
    setTimeout(() => {
      this.channel.postMessage({
        type: 'LEADER_CANDIDATE',
        tabId: this.myTabId,
        timestamp: Date.now()
      });
      
      // If no one else responded, become leader
      setTimeout(() => {
        if (!this.leaderId || this.leaderId === this.myTabId) {
          this.becomeLeader();
        }
      }, 1000);
    }, 500);
  }

  private respondToElection() {
    this.channel.postMessage({
      type: 'LEADER_CANDIDATE',
      tabId: this.myTabId,
      timestamp: Date.now()
    });
  }

  private becomeLeader() {
    if (this.isLeader) return;
    
    console.log('📊 Tab became recording leader:', this.myTabId);
    this.isLeader = true;
    this.leaderId = this.myTabId;
    
    // Store leader status with heartbeat
    localStorage.setItem('recording_leader', JSON.stringify({
      tabId: this.myTabId,
      timestamp: Date.now()
    }));
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Notify app that this tab can record
    window.dispatchEvent(new CustomEvent('recording_leader_changed', {
      detail: { isLeader: true, leaderId: this.myTabId }
    }));
  }

  private stepDown() {
    if (!this.isLeader) return;
    
    console.log('📊 Tab stepped down from recording leader');
    this.isLeader = false;
    this.stopHeartbeat();
    
    // Clear leader status if we were the leader
    const stored = localStorage.getItem('recording_leader');
    if (stored) {
      const { tabId } = JSON.parse(stored);
      if (tabId === this.myTabId) {
        localStorage.removeItem('recording_leader');
      }
    }
    
    // Notify app that this tab can no longer record
    window.dispatchEvent(new CustomEvent('recording_leader_changed', {
      detail: { isLeader: false, leaderId: this.leaderId }
    }));
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isLeader) {
        // Broadcast heartbeat
        this.channel.postMessage({
          type: 'LEADER_HEARTBEAT',
          tabId: this.myTabId,
          timestamp: Date.now()
        });
        
        // Update localStorage
        localStorage.setItem('recording_leader', JSON.stringify({
          tabId: this.myTabId,
          timestamp: Date.now()
        }));
      }
    }, 2000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private checkLeaderTimeout() {
    const stored = localStorage.getItem('recording_leader');
    if (!stored) {
      // No leader, try to become one
      if (!this.isLeader) {
        this.electLeader();
      }
      return;
    }
    
    const { tabId, timestamp } = JSON.parse(stored);
    const age = Date.now() - timestamp;
    
    // Leader heartbeat timeout (10 seconds)
    if (age > 10000) {
      console.log('📊 Leader heartbeat timeout, starting new election');
      localStorage.removeItem('recording_leader');
      this.leaderId = null;
      
      if (!this.isLeader) {
        this.electLeader();
      }
    }
  }

  // Public API
  canRecord(): boolean {
    return this.isLeader;
  }

  getLeaderId(): string | null {
    return this.leaderId;
  }

  isCurrentTabLeader(): boolean {
    return this.isLeader;
  }

  destroy() {
    this.stepDown();
    this.channel.close();
  }
}