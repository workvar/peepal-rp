package handlers

// approval_callbacks.go is the seam between the generic approval engine and
// the concrete business modules (leaves, payroll, …). Each module that
// participates in approval registers a callback here at init time. When the
// engine completes a request (approved or rejected), it invokes the callback
// so the module can apply the side effects (e.g. flip a Leave to approved
// and adjust the leave balance).

import (
	"collegeerp/models"
	"sync"
)

// ApprovalCallback is invoked when an ApprovalRequest reaches a terminal
// state. rejected=true means the flow ended with a reject decision.
// finalActor is the user.id of whoever cast the deciding vote.
type ApprovalCallback func(req *models.ApprovalRequest, rejected bool, finalActor string, comment string)

var (
	callbackMu sync.RWMutex
	callbacks  = map[models.ApprovalProcess]ApprovalCallback{}
)

// RegisterApprovalCallback attaches a callback for a process. Modules call
// this from init().
func RegisterApprovalCallback(process models.ApprovalProcess, cb ApprovalCallback) {
	callbackMu.Lock()
	defer callbackMu.Unlock()
	callbacks[process] = cb
}

func fireCallback(req *models.ApprovalRequest, rejected bool, actor, comment string) {
	callbackMu.RLock()
	cb, ok := callbacks[req.Process]
	callbackMu.RUnlock()
	if ok {
		cb(req, rejected, actor, comment)
	}
}
